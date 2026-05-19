document.addEventListener('alpine:init', () => {
    Alpine.data('drawioEditor', () => ({
        isEditing: false,
        editorFrame: null,
        _rendering: false,

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

        async displayDiagram() {
            if (this._rendering) return;
            this._rendering = true;

            const container = this.$refs.diagram_container;
            const width = 'doc_section' in this ? this.doc_section.width : this.section.width;
            const height = 'doc_section' in this ? this.doc_section.height : this.section.height;

            // Container setup
            container.style.aspectRatio = `${width} / ${height}`;
            container.style.width = '100%';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.overflow = 'hidden';

            const buildCarousel = (pages) => {

                const getSvgDimensions = (dataUrl) => {
                    const svg = atob(dataUrl.split(',')[1]);
                    const vb = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
                    if (vb) return { w: parseFloat(vb[1]), h: parseFloat(vb[2]) };
                        const w = svg.match(/width="([\d.]+)"/)?.[1];
                        const h = svg.match(/height="([\d.]+)"/)?.[1];
                        return w && h ? { w: parseFloat(w), h: parseFloat(h) } : null;
                };

                const imageBlock = (src) => {
                    const dims = getSvgDimensions(src);
                    const containerRatio = width / height;
                    const svgRatio = dims ? dims.w / dims.h : 16 / 9;

                    // Als SVG breder is dan container → 100% width
                    // Als SVG hoger is → width inperken zodat height niet overloopt
                    const imgWidthPct = (svgRatio > containerRatio
                        ? 100
                        : Math.round((svgRatio / containerRatio) * 100))-1;

                    return `
                        <div style="
                            flex:1;
                            min-height:0;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            padding:5px;
                            box-sizing:border-box;
                            overflow:hidden;
                        ">
                            <img src="${src}"
                                style="
                                    width: ${imgWidthPct}%;
                                    max-width:100%;
                                    max-height:100%;
                                    display:block;
                                " />
                        </div>
                    `;
                };

                if (pages.length === 1) {
                    container.innerHTML = `<div style="width:100%;
                        height:100%;
                        display:flex;
                        flex-direction:column;
                        min-height:0">${imageBlock(pages[0])}</div>`;
                    return;
                }

                let html = `
                    <div x-data="{page:0}" style="
                        width:100%;
                        height:100%;
                        display:flex;
                        flex-direction:column;
                        min-height:0;
                    ">
                `;

                pages.forEach((src, i) => {
                    html += `
                        <div x-show="page === ${i}" style="
                            flex:1;
                            display:flex;
                            min-height:0;
                        ">
                            ${imageBlock(src)}
                        </div>
                    `;
                });

                html += `
                    <div style="
                        display:flex;
                        justify-content:center;
                        gap:8px;
                        padding:8px;
                        flex-shrink:0;
                    ">
                `;

                pages.forEach((_, i) => {
                    html += `
                        <button
                            class="btn btn-xs opacity-10 hover:opacity-100"
                            :class="page===${i} ? 'btn-primary' : ''"
                            @click="page=${i}">
                            ${i + 1}
                        </button>
                    `;
                });

                html += `</div></div>`;

                container.innerHTML = html;
                Alpine.initTree(container);
            };

            // Cached renders direct tonen
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
                    try {
                        m = JSON.parse(evt.data);
                    } catch {
                        return;
                    }

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
                        const cacheKey = `drawio_render_${this.section.id}_${currentExportPage}`;
                        try {
                            localStorage.setItem(cacheKey, m.data);
                        } catch (e) {}

                        renderedPages[currentExportPage] = m.data;
                        currentExportPage++;

                        if (currentExportPage >= pageCount) {
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
