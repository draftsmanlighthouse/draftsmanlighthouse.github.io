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
        },
        add_mermaid_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "mermaid",
                extension: "mmd",
                data: ""
            });
        },
        add_chart_section(){
            const id = crypto.randomUUID();
            this.microDoc.json.sections.push({
                id: id,
                type: "chart",
                extension: "json",
                data: ""
            });
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


