document.addEventListener('alpine:init', () => {
    Alpine.data('gitModule', function(){
        return {
            documentation: [],
            selected: this.$persist("README.md"),
            repo: null,
            async init(){
                this.repo = await GitRepository.open("https://github.com/bohanssen/assistdummyrepo-model");
                let files = await this.repo.list();
                this.documentation = files.filter(x => x.endsWith(".md"));
            },
            async load_content(){
                let file = this.$el.getAttribute("file");
                console.log(file);
                let content = await this.repo.read(file);
                console.log(content);
                this.$el.innerText = content;
            }
        }
    });
});