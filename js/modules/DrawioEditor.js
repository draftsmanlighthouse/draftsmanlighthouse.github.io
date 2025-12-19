document.addEventListener('alpine:init', () => {
    Alpine.data('drawioEditor', () => ({
        isEditing: false,
        editorFrame: null,

        init() {
            if (!this.currentDiagram){
                this.currentDiagram = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
            }
            if (!("readonly" in this)){
                this.readonly = false;
            }
            this.displayDiagram();
            this.setupMessageHandling();
        },

        displayDiagram() {
            const viewer = 'https://notebook.bohanssen.com/diagram/viewer?embed=1&ui=min&spin=1&proto=json';
            const container = this.$refs.diagram_container;
            const width = 'doc_section' in this ? this.doc_section.width : this.section.width;
            const height = 'doc_section' in this ? this.doc_section.height : this.section.height;
            container.innerHTML = `<iframe id="${this.section.id}" frameborder="0" style="width:100%;aspect-ratio: ${width} / ${height};background: transparent;" src="${viewer}"></iframe>`;

            const iframe = container.querySelector('iframe');
            iframe.addEventListener('load', () => {
                iframe.contentWindow.postMessage(JSON.stringify({
                    action: 'load',
                    xml: this.currentDiagram
                }), '*');
            });
        },

        getEditorUrl() {
            const baseUrl = 'https://notebook.bohanssen.com/diagram/embed?embed=1&spin=1&modified=unsavedChanges&proto=json';
            return this.selectedMode === 'default'
                ? baseUrl
                : `${baseUrl}&ui=${this.selectedMode}`;
        },

        initEditor() {
            const container = this.$refs.editor_container;
            container.innerHTML = `<iframe frameborder="0" style="width:100%;height:600px;" src="${this.getEditorUrl()}" allowfullscreen></iframe>`;
            this.editorFrame = container.querySelector('iframe');
            if (this.editorFrame.requestFullscreen) {
                this.editorFrame.requestFullscreen();
            } else if (iframe.webkitRequestFullscreen) { // Safari
                this.editorFrame.webkitRequestFullscreen();
            } else if (iframe.msRequestFullscreen) { // IE11
                this.editorFrame.msRequestFullscreen();
            }
        },

        startEditing() {
            this.isEditing = true;
            this.initEditor();
        },

        switchToViewMode() {
            this.isEditing = false;
            this.displayDiagram();
            document.exitFullscreen();
        },

        setupMessageHandling() {
            window.addEventListener('message', (evt) => {
                if (![
                  this.editorFrame?.contentWindow,
                  this.$refs.diagram_container?.querySelector('iframe')?.contentWindow
                ].includes(evt.source)) return;
                if (evt.data.length > 0) {
                    try {
                        const msg = JSON.parse(evt.data);
                        if (msg.event === 'save') {
                            this.currentDiagram = msg.xml;
                            this.switchToViewMode();
                        }

                        if (msg.event === 'init') {
                            evt.source.postMessage(JSON.stringify({
                                action: 'load',
                                xml: this.currentDiagram
                            }), '*');
                        }

                        if (msg.event === 'exit') {
                            this.switchToViewMode();
                        }

                    } catch (e) {
                        console.error('Error processing message:', e);
                    }
                }
            });
        }
    }));
});
