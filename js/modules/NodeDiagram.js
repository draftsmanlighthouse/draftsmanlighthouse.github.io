document.addEventListener('alpine:init', () => {
  Alpine.data('NodeDiagram', function(){
    return {
       rawData: {},
       prepare_data(data, id,depth=1) {
          this.rawData = {};
          this.rawData[id] = data[id];
          for (let i = 0; i < depth; i++){
            const keys = Object.keys(this.rawData);
            for (const [key, value] of Object.entries(data)) {
              Object.keys(value.outbound).filter(id => keys.includes(id)).forEach(id => {
                this.rawData[key] = value;
              });
              Object.keys(value.inbound).filter(id => keys.includes(id)).forEach(id => {
                this.rawData[key] = value;
              });
            }
          }
        },
       updateRect() {
          const parent = this.$el.parentElement;
          const r = parent.getBoundingClientRect();
          this.rect = { width: r.width, height: r.height };
        },
      render(w=null,h=null) {
        // --- Convert data to nodes and links ---
        const nodes = Object.entries(this.rawData).map(([id, obj]) => ({ id, title: obj.title }));
        const links = [];
        const keys = Object.keys(this.rawData);
        for (const [sourceId, obj] of Object.entries(this.rawData)) {
          if (obj.outbound) {
            for (const [targetId, label] of Object.entries(obj.outbound)) {
              if (keys.includes(sourceId) && keys.includes(targetId)){
                links.push({ source: sourceId, target: targetId, label });
              }
            }
          }
        }

        // --- SVG setup ---
        const width = w || 600;
        const height = h || 400;

        const svg = d3.select(this.$el)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("cursor", "grab");

        const zoomLayer = svg.append("g").attr("class", "zoom-layer");

        const simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).distance(150).id(d => d.id))
          .force("charge", d3.forceManyBody().strength(-250))
          .force("center", d3.forceCenter(width / 2, height / 2));

        // --- Draw links ---
        const link = zoomLayer.append("g")
          .attr("stroke", "#d1d5db")
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke-width", 1.5);

        // --- Draw nodes ---
        const node = zoomLayer.append("g")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .selectAll("circle")
          .data(nodes)
          .join("circle")
          .attr("r", d => d.id === window.location.hash.replace("#","") ? 22 : 15)
          .attr("fill", d => d.id === window.location.hash.replace("#","") ? "#f59e0b" : "#4f46e5")
          .call(drag(simulation))
          .on("mouseover", (event, d) => {
            if (d.id !== window.location.hash.replace("#","")) d3.select(event.currentTarget).attr("fill", "#818cf8");
            label.filter(l => l.id === d.id)
              .attr("visibility", "visible")
              .attr("fill", "black")
              .attr("font-weight", "bold");
          })
          .on("mouseout", (event, d) => {
            if (d.id !== window.location.hash.replace("#","")) d3.select(event.currentTarget).attr("fill", "#4f46e5");
            if (d.id !== window.location.hash.replace("#",""))
              label.filter(l => l.id === d.id).attr("visibility", "hidden");
          })
          .on("dblclick", (event, d) => {
            location.href = "#" + d.id;
            setTimeout(location.reload,100);
          });

        // --- Labels ---
        const label = zoomLayer.append("g")
          .selectAll("text")
          .data(nodes)
          .join("text")
          .attr("text-anchor", "middle")
          .attr("dy", 28)
          .attr("visibility", d => d.id === window.location.hash.replace("#","") ? "visible" : "hidden")
          .attr("fill", "black")
          .attr("font-size", "10px")
          .attr("font-weight", d => d.id === window.location.hash.replace("#","") ? "bold" : "normal")
          .text(d => d.title);

        // --- Simulation tick updates ---
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
        });

        // --- Add zoom behavior ---
        const zoom = d3.zoom()
          .scaleExtent([0.2, 3])
          .on("zoom", (event) => {
            zoomLayer.attr("transform", event.transform);
          });

        svg.call(zoom);

        // --- Auto-fit after simulation ends ---
        simulation.on("end", () => fitView());

        function fitView() {
          const bounds = zoomLayer.node().getBBox();
          const scale = 0.9 / Math.max(bounds.width / width, bounds.height / height);
          const translate = [
            width / 2 - scale * (bounds.x + bounds.width / 2),
            height / 2 - scale * (bounds.y + bounds.height / 2)
          ];
          svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(...translate).scale(scale)
          );
        }

        // --- Drag behavior helper ---
        function drag(simulation) {
          function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            svg.style("cursor", "grabbing");
          }
          function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
          }
          function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            svg.style("cursor", "grab");
          }
          return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }
      }
    }
  });
});