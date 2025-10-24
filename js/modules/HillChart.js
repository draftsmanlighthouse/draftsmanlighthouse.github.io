document.addEventListener("alpine:init", () => {
  Alpine.data("hillChart", (data, opts = {}) => ({
    hill_data: data,
    readonly: opts.readonly ?? false,
    svg: null,
    width: 600,
    height: 200,

    init() {
      this.renderHill();
    },

    renderHill() {
      const container = this.$el;
      const w = this.width;
      const h = this.height;
      const xMin = 20,
        xMax = w - 20,
        xMid = (xMin + xMax) / 2;
      const amplitude = h / 2.5;
      const period = w;
      const phase = w / 4;
      const vShift = h / 2;
      const B = (2 * Math.PI) / period;
      const hillY = (x) => amplitude * Math.sin(B * (x + phase)) + vShift;

      container.innerHTML = "";

      // SVG basis
      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", h)
        .attr("viewBox", `0 0 ${w} ${h}`)
        .attr("class", "bg-base-100 rounded-box");

      this.svg = svg;

      // Tooltip
      const tooltip = d3
        .select(container)
        .append("div")
        .attr("class", "z-50")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("transition", "opacity 0.15s ease-in-out")
        .style("background", "var(--b1)")
        .style("color", "var(--bc)")
        .style("border", "1px solid var(--b2)")
        .style("border-radius", "0.5rem")
        .style("padding", "0.4rem 0.6rem")
        .style("font-size", "0.75rem")
        .style("box-shadow", "0 4px 10px rgba(0,0,0,0.1)");

      // Hill pad
      const hillPts = d3.range(xMin, xMax).map((x) => ({ x, y: hillY(x) }));
      svg
        .append("path")
        .datum(hillPts)
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .attr(
          "d",
          d3
            .line()
            .curve(d3.curveBasis)
            .x((d) => d.x)
            .y((d) => d.y)
        );

      // Labels
      const labels = [
        { x: xMid - xMid / 2, text: "Explore" },
        { x: xMid, text: "Decide" },
        { x: xMid + xMid / 2, text: "Build" },
        { x: xMax, text: "Finish" },
      ];
      labels.forEach(({ x, text }) => {
        svg
          .append("text")
          .attr("x", x)
          .attr("y", h - 10)
          .attr("text-anchor", "middle")
          .attr("fill", "#6b7280")
          .attr("font-size", 12)
          .text(text);
      });

      // Punten
      const palette = ["#3b82f6", "#ef4444", "#10b981", "#a855f7", "#f59e0b"];
      const clampX = (x) => Math.max(xMin, Math.min(xMax, x));
      const toX = (progress) => xMin + (xMax - xMin) * (progress / 100);

      const r = 7;

      const groups = svg
        .selectAll(".hill-point")
        .data(this.hill_data)
        .enter()
        .append("g")
        .attr("class", "hill-point cursor-pointer")
        .attr("transform", (d) => {
          const x = toX(d.progress);
          return `translate(${x},${hillY(x)})`;
        });

      groups
        .append("circle")
        .attr("r", r)
        .attr("fill", (d, i) => palette[i % palette.length]);

      groups
        .append("text")
        .attr("y", -r - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#111827")
        .text((d) => d.name);

      // Tooltip events
      groups
        .on("mouseover", function (event, d) {
          tooltip
            .html(
              `<div class="font-semibold">${d.name}</div>
               <div class="text-xs">Progress: ${Math.round(
                 d.progress
               )}%</div>
               <div x-show="'${d.name}' != ''" class="text-xs">click to open</div>`
            )
            .style("opacity", 1);
        })
        .on("mousemove", function (event) {
          console.log(event);
          tooltip
            .style("left", event.clientX + 12 + "px")
            .style("top", event.clientY + 30 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });

      // Interactiviteit
      if (this.readonly) {
        // Alleen klik-event
        groups.on("click", (event, d) => {
          window.dispatchEvent(
            new CustomEvent("hillclick", {
              detail: { id: d.id ?? d.name, data: d },
            })
          );
        });
      } else {
        // Drag gedrag in edit mode
        let offsetX = 0;

        groups.call(
          d3
            .drag()
            .on("start", function (event, d) {
              const transform = d3.select(this).attr("transform");
              const match = transform.match(/translate\(([^,]+),/);
              const currentX = match ? parseFloat(match[1]) : 0;
              offsetX = currentX - event.x;
              d3.select(this).select("circle").attr("r", r * 1.3);
            })
            .on("drag", function (event, d) {
              let x = event.x + offsetX;
              x = clampX(x);
              d.progress = ((x - xMin) / (xMax - xMin)) * 100;
              const y = hillY(x);
              d3.select(this).attr("transform", `translate(${x},${y})`);
            })
            .on("end", function () {
              d3.select(this).select("circle").attr("r", r);
            })
        );
      }
    },
  }));
});