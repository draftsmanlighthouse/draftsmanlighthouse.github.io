
function load_diagram(iframe,content){
    setTimeout(function(){
        iframe.contentWindow.postMessage(JSON.stringify({
            action: 'load',
            xml: content
        }), '*');
    },500);
}

function load_chart(canvas, section){
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
    new Chart(canvas, {
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

function load_table(table,section){
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
}

async function load_mermaid(element,section){
    mermaid.initialize({
        startOnLoad: false,
        theme: "default"
    });
    const { svg } = await mermaid.render('diagram-svg', section.data);
    element.innerHTML = svg;
}