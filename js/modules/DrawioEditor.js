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
            this.setupMessageHandling();
            this.displayDiagram();
        },

//        async displayDiagram() {
//            const container = this.$refs.diagram_container;
//            const width = 'doc_section' in this ? this.doc_section.width : this.section.width;
//            const height = 'doc_section' in this ? this.doc_section.height : this.section.height;
//            container.style.aspectRatio = `${width} / ${height}`;
//
//            // Toon cached render direct
//            const cacheKey = `drawio_render_${this.section.id}`;
//            const cached = localStorage.getItem(cacheKey);
//            if (cached) {
//                container.innerHTML = `<img src="${cached}" style="width:calc(100% - 10px);height:calc(100% - 10px);object-fit:contain;margin:5px;" />`;
//            }
//
//            return new Promise((resolve) => {
//                const iframe = document.createElement('iframe');
//                iframe.style.position = 'fixed';
//                iframe.style.left = '-9999px';
//                iframe.style.top = '0';
//                iframe.style.width = '1200px';
//                iframe.style.height = '900px';
//                iframe.style.visibility = 'hidden';
//                iframe.src = this.getEditorUrl();
//                document.body.appendChild(iframe);
//
//                let exported = false;
//
//                const handler = (evt) => {
//                    if (evt.source !== iframe.contentWindow) return;
//                    let msg;
//                    try { msg = JSON.parse(evt.data); } catch { return; }
//
//                    if (msg.event === 'init') {
//                        iframe.contentWindow.postMessage(JSON.stringify({
//                            action: 'load',
//                            xml: this.currentDiagram
//                        }), '*');
//                    }
//
//                    if (msg.event === 'load' && msg.pageVisible && !exported) {
//                        exported = true;
//                        const delay = this.selectedMode === 'sketch' ? 1500 : 0;
//                        setTimeout(() => {
//                            iframe.contentWindow.postMessage(JSON.stringify({
//                                action: 'export',
//                                format: 'svg',
//                                xml: this.currentDiagram
//                            }), '*');
//                        }, delay);
//                    }
//
//                    if (msg.event === 'export' && msg.pageVisible) {
//                        window.removeEventListener('message', handler);
//                        document.body.removeChild(iframe);
//
//                        // Cache opslaan en weergeven
//                        try { localStorage.setItem(cacheKey, msg.data); } catch (e) {}
//                        container.innerHTML = `<img src="${msg.data}" style="width:calc(100% - 10px);height:calc(100% - 10px);object-fit:contain;margin:5px;" />`;
//                        resolve();
//                    }
//                };
//
//                window.addEventListener('message', handler);
//            });
//        },

        async displayDiagram() {
            if (this._rendering) return;
            this._rendering = true;

            const container = this.$refs.diagram_container;
            const width = 'doc_section' in this ? this.doc_section.width : this.section.width;
            const height = 'doc_section' in this ? this.doc_section.height : this.section.height;
            container.style.aspectRatio = `${width} / ${height}`;

            const buildCarousel = (pages) => {
                if (pages.length === 1) {
                    container.innerHTML = `<img src="${pages[0]}" style="width:calc(100% - 10px);object-fit:contain;margin:5px;display:block;" />`;
                    return;
                }

                let html = '<div x-data="{page:0}" style="width:100%;">';
                pages.forEach((src, i) => {
                    html += `
                        <div x-show="page === ${i}" style="width:100%;">
                            <img src="${src}" style="width:calc(100% - 10px);object-fit:contain;margin:5px;display:block;" />
                        </div>`;
                });
                html += '<div style="display:flex;justify-content:center;gap:8px;padding:8px;">';
                pages.forEach((_, i) => {
                    html += `<button class="btn btn-xs" :class="page===${i} ? 'btn-primary' : ''" @click="page=${i}">${i + 1}</button>`;
                });
                html += '</div></div>';

                container.innerHTML = html;
                Alpine.initTree(container);
            };

            // Toon cached renders direct
            const cachedPages = [];
            let i = 0;
            while (true) {
                const cached = localStorage.getItem(`drawio_render_${this.section.id}_${i}`);
                if (!cached) break;
                cachedPages.push(cached);
                i++;
            }
            if (cachedPages.length > 0) {
                buildCarousel(cachedPages);
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(this.currentDiagram, 'text/xml');
            const diagrams = xmlDoc.querySelectorAll('diagram');
            const pageCount = diagrams.length || 1;

            return new Promise((resolve) => {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.left = '-9999px';
                iframe.style.top = '0';
                iframe.style.width = '1200px';
                iframe.style.height = '900px';
                iframe.style.visibility = 'hidden';
                iframe.src = this.getEditorUrl();
                document.body.appendChild(iframe);

                let currentExportPage = 0;
                const renderedPages = [];

                const loadPage = (pageIndex) => {
                    const singlePage = `<mxfile><diagram>${diagrams[pageIndex].innerHTML}</diagram></mxfile>`;
                    iframe.contentWindow.postMessage(JSON.stringify({
                        action: 'load',
                        xml: singlePage
                    }), '*');
                };

                const pageHandler = (evt) => {
                    if (evt.source !== iframe.contentWindow) return;
                    let m;
                    try { m = JSON.parse(evt.data); } catch { return; }

                    if (m.event === 'init') {
                        loadPage(currentExportPage);
                    }

                    if (m.event === 'load' && m.pageVisible) {
                        const delay = this.selectedMode === 'sketch' ? 1500 : 0;
                        setTimeout(() => {
                            iframe.contentWindow.postMessage(JSON.stringify({
                                action: 'export',
                                format: 'svg'
                            }), '*');
                        }, delay);
                    }

                    if (m.event === 'export') {
                        console.log('[drawio] export ontvangen, pagina:', currentExportPage, 'van', pageCount);

                        const cacheKey = `drawio_render_${this.section.id}_${currentExportPage}`;
                        try { localStorage.setItem(cacheKey, m.data); } catch (e) {}

                        renderedPages[currentExportPage] = m.data;
                        currentExportPage++;

                        if (currentExportPage >= pageCount) {
                            console.log('[drawio] alle paginas geëxporteerd, klaar');
                            window.removeEventListener('message', pageHandler);
                            document.body.removeChild(iframe);
                            buildCarousel(renderedPages);
                            this._rendering = false;
                            resolve();
                        } else {
                            loadPage(currentExportPage);
                        }
                    }
                };

                window.addEventListener('message', pageHandler);
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
            } else if (this.editorFrame.webkitRequestFullscreen) { // Safari
                this.editorFrame.webkitRequestFullscreen();
            } else if (this.editorFrame.msRequestFullscreen) { // IE11
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
            const allowedSources = [
              this.editorFrame?.contentWindow,
              this.$refs.diagram_container?.querySelector('iframe')?.contentWindow
            ].filter(Boolean);
        
            if (!allowedSources.includes(evt.source)) return;
        
            let msg = evt.data;
            if (typeof msg === 'string') {
              try { msg = JSON.parse(msg); } catch { return; }
            }
            if (!msg || typeof msg !== 'object') return;
        
            if (msg.event === 'init') {
              evt.source.postMessage(JSON.stringify({
                action: 'load',
                xml: this.currentDiagram
              }), '*');
            }
        
            if (msg.event === 'save') {
              this.currentDiagram = msg.xml;
              this.switchToViewMode();
            }
        
            if (msg.event === 'exit') {
              this.switchToViewMode();
            }
          });
        }
    }));
});
