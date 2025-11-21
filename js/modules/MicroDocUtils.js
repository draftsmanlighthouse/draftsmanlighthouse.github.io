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
        removeSection(section){
            this.microDoc.json.sections = this.microDoc.json.sections.filter(x => x.id != section.id);
            if (!('archive' in this.microDoc.json)){
                this.microDoc.json.archive = [];
            }
            this.microDoc.json.archive.push(section);
            this.$dispatch("change");
        }
    }
  });
});