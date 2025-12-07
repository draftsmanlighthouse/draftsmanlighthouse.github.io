document.addEventListener('alpine:init', () => {
  Alpine.data('SectionHelper', function(){
    return {
        add_markdown_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "markdown",
                extension: "md",
                data: "# New markdown section\n\n lorem ipsum..."
            });
            this.$dispatch("change");
            return id;
        },
        add_drawio_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "drawio",
                extension: "drawio",
                data: ""
            });
            this.$dispatch("change");
            return id;
        },
        add_sketch_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "sketch",
                extension: "drawio",
                data: ""
            });
            this.$dispatch("change");
            return id;
        },
        add_mermaid_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "mermaid",
                extension: "mmd",
                data: ""
            });
            return id;
        },
        add_chart_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "chart",
                extension: "json",
                data: ""
            });
            return id;
        },
        add_reference_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "reference",
                document: "",
                sections: [],
                version: "latest"
            });
            return id;
        },
        async addImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            const ext = file.name.split('.').pop().toLowerCase();
            const id = "img-" + crypto.randomUUID();

            // nieuwe sectie
            const section = {
                id,
                type: "image",
                extension: ext,
                created: Date.now()
            };

            // wegschrijven op disk
            const { dir } = this.microDoc;
            const handle = await dir.getFileHandle(section.id + "." + ext, { create: true });
            const writable = await handle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();

            // toevoegen aan microDoc
            const sectionFile = await handle.getFile();
            section.data = URL.createObjectURL(sectionFile);
            this.microDoc.json.sections.push(section);

            this.save_doc();
            return id;
        },
        add_table_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "table",
                extension: "json",
                rows: 3,
                cols: 2,
                header: {
                    col: true,
                    row: true
                },
                data: [
                    {
                        col: 0,
                        row: 0,
                        value: "Col 1"
                    },
                    {
                        col: 0,
                        row: 1,
                        value: "Row 1"
                    },
                    {
                        col: 0,
                        row: 2,
                        value: "Row 2"
                    },
                    {  col: 1,
                       row: 0,
                       value: "Col 2"
                    },
                    {  col: 1,
                       row: 1,
                       value: "A"
                    },
                    {  col: 1,
                       row: 2,
                       value: "B"
                    }
                ]
            });
            return id;
        },
        add_html_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "html",
                extension: "html",
                data: '<p class="p-3"> \n\t<h3 class="text-xl">\n\t\tHello World!\n\t</h3>\n</p>'
            });
            this.$dispatch("change");
            return id;
        },
        add_slide_section(layout="A"){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "slide",
                title: "Slide: " + (this.microDoc.json.sections.filter(x => x.type == 'slide').length + 1),
                layout: layout,
                sections: {}
            });
            this.pointer = this.microDoc.json.sections.at(-1);
            this.$dispatch("load-slide");
            return id;
        },
        removeSection(section){
            this.microDoc.json.sections = this.microDoc.json.sections.filter(x => x.id != section.id);
            if (!('archive' in this.microDoc.json)){
                this.microDoc.json.archive = [];
            }
            if (section.type != 'reference'){
                this.microDoc.json.archive.push(section);
            }
            this.$dispatch("change");
        }
    }
  });
});


