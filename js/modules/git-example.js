document.addEventListener('alpine:init', () => {
    Alpine.data('gitModule', function(){
        return {
            documentation: [],
            changes: [],
            selected: this.$persist("README.md"),
            repo: null,
            async init(){
                let repo = await GitRepository.open("https://github.com/bohanssen/assistdummyrepo-model");
                this.repo = repo;
                let files = await this.repo.list();
                this.documentation = files.filter(x => x.endsWith(".md"));
                setInterval(this._list_changes.bind(this),1000);
            },
            async load_content(){
                let file = this.$el.getAttribute("file");
                let content = await this.repo.read(file);
                content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                this.$el.value = content;
            },
            async save_content(){
                let file = this.$el.getAttribute("file");
                let content = this.$el.value;
                let hist = await this.repo.read(file);
                if (hist != content){
                    await this.repo.write(file,content);
                } else {
                }
            },
            async revert_file(){
                let file = this.$el.getAttribute("file");
                console.log(await this.repo.revert(file));
                this.documentation = [];
                let files = await this.repo.list();
                this.documentation = files.filter(x => x.endsWith(".md"));
            },
            async _list_changes(){
                let changes = await this.repo.status();
                this.changes = changes.filter(x => x.status != "unaltered");
            }
        }
    });
});