document.addEventListener('alpine:init', () => {
    Alpine.data('mermaidEditor', () => ({
        isEditing: false,
        editorFrame: null,
        initialized: false,

        init() {
            if (!this.currentDiagram){
                this.currentDiagram = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`;
            }

            mermaid.initialize({
                startOnLoad: false,
                theme: "default"
            });
            this.displayDiagram();
            setTimeout(this.displayDiagram.bind(this),100);
        },

        async displayDiagram() {
            const container = this.$refs.diagram_viewer;
            try {
                const { svg } = await mermaid.render('diagram-svg', this.currentDiagram);
                container.innerHTML = svg;
            } catch (error) {
                container.innerHTML = `<pre style="color: #d32f2f;">Error rendering diagram: ${error.message}</pre>`;
            }
        }

    }));
});