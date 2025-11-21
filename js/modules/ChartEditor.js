document.addEventListener('alpine:init', () => {
    Alpine.data('chartEditor', () => ({
      chart: null,
      currentEditorMode: 'csv',
      isEditing: false,
      error: '',

      init() {
        // 1. Defaults voor de component zelf
        this.currentChartType ??= "bar";
        this.currentViewMode  ??= "chart";
        this.readonly         ??= false;

        // 2. Alleen als dit een chart-section is:
        if (this.section.type === "chart") {

            // Zet defaults als ze ontbreken
            this.section.chart_type ??= "bar";
            this.section.view_mode  ??= "chart";

            // Sync component state met section
            this.currentChartType = this.section.chart_type;
            this.currentViewMode  = this.section.view_mode;
        }

        if (!this.currentData){
            this.currentData = {
              labels: ['January', 'February', 'March', 'April', 'May', 'June'],
              datasets: [{
                label: 'Sales 2024',
                data: [65, 59, 80, 81, 56, 55],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              }]
            };
        } else {
            this.currentData
        }
        this.$nextTick(() => {
          this.displayChart();
          this.displayTable();
        });
      },

      /* ---------- DISPLAY ---------- */
      displayChart() {
        const ctx = this.$refs.chartCanvas;
        if (this.chart) this.chart.destroy();
        if (Chart.getChart(ctx)) {
            Chart.getChart(ctx).destroy();
        }
        const colors = [
          'rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)',
          'rgba(255,206,86,0.2)', 'rgba(54,162,235,0.2)',
          'rgba(153,102,255,0.2)', 'rgba(255,159,64,0.2)'
        ];
        const borderColors = colors.map(c => c.replace('0.2', '1'));

        const datasets = this.currentData.datasets.map((ds, i) => ({
          ...ds,
          backgroundColor: ds.backgroundColor ||
            (['pie', 'doughnut'].includes(this.currentChartType)
              ? colors
              : colors[i % colors.length]),
          borderColor: ds.borderColor ||
            (['pie', 'doughnut'].includes(this.currentChartType)
              ? borderColors
              : borderColors[i % borderColors.length]),
          borderWidth: ds.borderWidth || 1
        }));

        this.chart = new Chart(ctx, {
          type: this.currentChartType,
          data: { labels: this.currentData.labels, datasets },
          options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: ['pie', 'doughnut', 'radar'].includes(this.currentChartType)
              ? {}
              : { y: { beginAtZero: true } }
          }
        });
      },

      displayTable() {
        const container = this.$refs.tableDisplay;
        let html = `<table class='table table-zebra w-full'>
          <thead><tr><th>Label</th>`;
        this.currentData.datasets.forEach(ds => (html += `<th>${ds.label}</th>`));
        html += '</tr></thead><tbody>';
        this.currentData.labels.forEach((label, i) => {
          html += `<tr><td class="font-semibold">${label}</td>`;
          this.currentData.datasets.forEach(ds => {
            html += `<td>${ds.data[i] || 0}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
      },

      /* ---------- INTERACTIONS ---------- */
      changeChartType(type) {
        this.currentChartType = type;
        this.section.chart_type = type;
        this.displayChart();
      },
      changeViewMode(mode) {
        this.currentViewMode = mode;
        this.section.view_mode = mode;
      },

      /* ---------- EDITOR ---------- */
      startEditing() {
        this.isEditing = true;
        this.error = '';
        this.$nextTick(() => {
          this.$refs.jsonData.value = JSON.stringify(this.currentData, null, 2);
          this.$refs.csvData.value = this.dataToCSV();
        });
      },
      switchTab(mode, event) {
        this.currentEditorMode = mode;
      },

      dataToCSV() {
        let csv = 'Label,' + this.currentData.datasets.map(ds => ds.label).join(',') + '\n';
        this.currentData.labels.forEach((label, i) => {
          csv +=
            label +
            ',' +
            this.currentData.datasets.map(ds => ds.data[i] || 0).join(',') +
            '\n';
        });
        return csv;
      },
      csvToData(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',');
        const labels = [];
        const datasets = headers.slice(1).map(h => ({ label: h.trim(), data: [] }));
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          labels.push(values[0].trim());
          for (let j = 1; j < values.length; j++) {
            datasets[j - 1].data.push(parseFloat(values[j]) || 0);
          }
        }
        return { labels, datasets };
      },

      saveAndExit() {
        this.error = '';
        try {
          if (this.currentEditorMode === 'json') {
            this.currentData = JSON.parse(this.$refs.jsonData.value);
          } else {
            this.currentData = this.csvToData(this.$refs.csvData.value);
          }
          this.isEditing = false;
          this.$nextTick(() => {
            this.displayChart();
            this.displayTable();
          });
        } catch (e) {
          this.error = `Error: ${e.message}`;
        }
      },
      cancelEdit() {
        this.isEditing = false;
        this.error = '';
      }
    }));
  });