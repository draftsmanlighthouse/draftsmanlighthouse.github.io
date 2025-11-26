
async function prepare(){
    let doc = JSON.parse(localStorage.export);
    const container = document.getElementById("source");
    document.title = doc.name;
    window.sections = doc.sections;
    for (const section of doc.sections){
        const wrapper = document.createElement("div");
        wrapper.className = "section-block";
        wrapper.style.margin = "2rem 0";

        if (section.type == "markdown"){
            wrapper.innerHTML = marked.parse(section.data);
            container.appendChild(wrapper);
        }

        if (['drawio','sketch'].includes(section.type)){
            const viewer = 'https://diagram.bohanssen.com/viewer?embed=1&ui=min&spin=1&proto=json';
            wrapper.innerHTML = `<iframe id="${section.id}" frameborder="0" style="width:100%;aspect-ratio: ${section.width} / ${section.height};" src="${viewer}"></iframe>`;
            container.appendChild(wrapper);
            setTimeout(function(){
                document.getElementById(section.id).contentWindow.postMessage(JSON.stringify({
                    action: 'load',
                    xml: section.data
                }), '*');
            },1000);
        }

        if (section.type == "mermaid"){
            mermaid.initialize({
                startOnLoad: false,
                theme: "default"
            });
            const { svg } = await mermaid.render('diagram-svg', section.data);
            wrapper.innerHTML = svg;
            container.appendChild(wrapper);
        }

        if (section.type == "image"){
            wrapper.innerHTML = `<img src="${section.data}" id="${section.id}" style="width: 100%">`;
            container.appendChild(wrapper);
        }

        if (section.type == "chart"){
            container.appendChild(wrapper);
            if (['chart','both'].includes(section.view_mode)){
                const chart = document.createElement("canvas");
                chart.id = section.id;
                chart.dataset.sourceId = section.id;
                chart.classList.add("chart-export");
                wrapper.appendChild(chart);
                const colors = [
                  'rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)',
                  'rgba(255,206,86,0.2)', 'rgba(54,162,235,0.2)',
                  'rgba(153,102,255,0.2)', 'rgba(255,159,64,0.2)'
                ];
                const borderColors = colors.map(c => c.replace('0.2', '1'));
                const datasets = section.data.datasets.map((ds, i) => ({
                  ...ds,
                  backgroundColor: ds.backgroundColor ||
                    (['pie', 'doughnut'].includes(section.chart_type)
                      ? colors
                      : colors[i % colors.length]),
                  borderColor: ds.borderColor ||
                    (['pie', 'doughnut'].includes(section.chart_type)
                      ? borderColors
                      : borderColors[i % borderColors.length]),
                  borderWidth: ds.borderWidth || 1
                }));
                new Chart(document.getElementById(section.id), {
                  type: section.chart_type,
                  data: { labels: section.data.labels, datasets },
                  options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: ['pie', 'doughnut', 'radar'].includes(this.currentChartType)
                      ? {}
                      : { y: { beginAtZero: true } }
                  }
                });
            }
            if (['table','both'].includes(section.view_mode)){
                let table = document.createElement("div");
                let html = `<table class='table table-zebra w-full'>
                  <thead><tr><th>Label</th>`;
                section.data.datasets.forEach(ds => (html += `<th>${ds.label}</th>`));
                html += '</tr></thead><tbody>';
                section.data.labels.forEach((label, i) => {
                  html += `<tr><td class="font-semibold">${label}</td>`;
                  section.data.datasets.forEach(ds => {
                    html += `<td>${ds.data[i] || 0}</td>`;
                  });
                  html += '</tr>';
                });
                html += '</tbody></table>';
                table.innerHTML = html;
                wrapper.appendChild(table);
            }
        }
    }
    setTimeout(function(){
//        document.querySelectorAll(".pagedjs_page img").forEach(img => {
//            const section = window.sections.find(s => s.id === img.id);
//            img.src = section.data;
//        });
        document.querySelectorAll(".pagedjs_page canvas").forEach(canvas => {
        const id = canvas.dataset.sourceId;
        const section = window.sections.find(s => s.id === id);
        if (!section) return;

        new Chart(canvas, {
          type: section.chart_type,
          data: section.data,
          options: { responsive: false }
        });
      });
    },1000);
    return doc;
}
