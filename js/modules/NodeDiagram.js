document.addEventListener('alpine:init', () => {
  Alpine.data('NodeDiagram', () => ({
    rawData: {},
    root: null,

    prepare_data(data, root, depth = 1) {
      // BFS — veel efficiënter en duidelijker
      const queue = Array.isArray(root) ? root : [root];
      this.root = [...queue];
      const visited = new Set(this.root);

      for (let i = 0; i < depth; i++) {
        const next = [];
        for (const id of queue) {
          const node = data[id];
          if (!node) continue;

          // Outbound
          for (const t of Object.keys(node.outbound || {})) {
            if (!visited.has(t)) {
              visited.add(t);
              next.push(t);
            }
          }

          // Inbound
          for (const s of Object.keys(node.inbound || {})) {
            if (!visited.has(s)) {
              visited.add(s);
              next.push(s);
            }
          }
        }
        queue.splice(0, queue.length, ...next);
      }

      // Build rawData
      this.rawData = {};
      for (const id of visited) this.rawData[id] = data[id];
    },

    render(w = 600, h = 400) {
      // Cleanup
      d3.select(this.$el).select("svg").remove();

      const nodes = Object.entries(this.rawData).map(([id, obj]) => ({
        id, title: obj.title
      }));

      const links = [];
      const keys = Object.keys(this.rawData);

      for (const [src, obj] of Object.entries(this.rawData)) {
        for (const [dst, label] of Object.entries(obj.outbound || {})) {
          if (keys.includes(dst)) {
            links.push({ source: src, target: dst, label });
          }
        }
      }

      const svg = d3.select(this.$el)
        .append("svg")
        .attr("width", w)
        .attr("height", h);

      const zoomLayer = svg.append("g");

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(140))
        .force("charge", d3.forceManyBody().strength(-240))
        .force("center", d3.forceCenter(w / 2, h / 2));

      const link = zoomLayer.append("g")
        .attr("stroke", "#d1d5db")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 1.4);

      const linkLabel = zoomLayer.append("g")
          .selectAll("text")
          .data(links)
          .join("text")
          .attr("font-size", "9px")
          .attr("fill", "#4b5563")
          .attr("text-anchor", "middle")
          .style("visibility", "hidden");

      const node = zoomLayer.append("g")
          .selectAll("circle")
          .data(nodes)
          .join("circle")
          .attr("r", d => this.root.includes(d.id) ? 22 : 14)
          .attr("fill", d => this.root.includes(d.id) ? "#f59e0b" : "#4f46e5")
          .call(d3.drag()
            .on("start", dragstart)
            .on("drag", dragmove)
            .on("end", dragend)
          )
          .on("click", (_, d) => {
            this.open_doc(d.id);
          });

      node.on("mouseover", (event, d) => {

          // Bepaal buren
          const neighbors = new Set([
            ...Object.keys(this.rawData[d.id]?.outbound || {}),
            ...Object.keys(this.rawData[d.id]?.inbound || {})
          ]);

          // Node labels zichtbaar maken voor hover node + neighbors
            label.attr("visibility", n =>
              this.root.includes(n.id)
                ? "visible"
                : (neighbors.has(n.id) || n.id === d.id ? "visible" : "hidden")
            );
          // Highlight nodes
          node.attr("fill", n =>
            this.root.includes(n.id)
              ? "#f59e0b"
              : neighbors.has(n.id) || n.id === d.id
                ? "#818cf8"
                : "#4f46e5"
          );

          // Highlight links
          link.attr("stroke", e =>
            e.source.id === d.id || e.target.id === d.id ? "#818cf8" : "#d1d5db"
          );

          // Labels per link bepalen vanuit d (hover node)
          linkLabel
            .text(e => {
              if (e.source.id === d.id) {
                return this.rawData[d.id]?.outbound?.[e.target.id] || "";
              }
              if (e.target.id === d.id) {
                return this.rawData[d.id]?.inbound?.[e.source.id] || "";
              }
              return "";
            })
            .style("visibility", e =>
              e.source.id === d.id || e.target.id === d.id
                ? "visible"
                : "hidden"
            );
        });
      node.on("mouseout", () => {
          node.attr("fill", n =>
            this.root.includes(n.id) ? "#f59e0b" : "#4f46e5"
          );

          link.attr("stroke", "#d1d5db");

          // node-labels resetten
          label.attr("visibility", n =>
            this.root.includes(n.id) ? "visible" : "hidden"
          );
          // hide all labels
          linkLabel.style("visibility", "hidden");
        });

      const label = zoomLayer.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("text-anchor", "middle")
        .attr("dy", 28)
        .attr("font-size", "10px")
        .attr("font-weight", d => this.root.includes(d.id) ? "bold" : "normal")
        .attr("visibility", d => this.root.includes(d.id) ? "visible" : "hidden")
        .text(d => d.title);

      simulation.on("tick", () => {
          link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

          node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

          label
            .attr("x", d => d.x)
            .attr("y", d => d.y);

          linkLabel
              .attr("x", d => (d.source.x + d.target.x) / 2)
              .attr("y", d => (d.source.y + d.target.y) / 2);
        });


      const zoom = d3.zoom()
          .scaleExtent([0.2, 3])
          .on("zoom", e => zoomLayer.attr("transform", e.transform));

        svg.call(zoom);

      simulation.on("end", fitView);

      function fitView() {
        const b = zoomLayer.node().getBBox();
        const scale = 0.9 / Math.max(b.width / w, b.height / h);
        const translate = [
          w / 2 - scale * (b.x + b.width / 2),
          h / 2 - scale * (b.y + b.height / 2)
        ];

        svg.transition().duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(...translate).scale(scale));
      }

      function dragstart(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragmove(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragend(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
  }));
});