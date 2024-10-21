document.addEventListener('alpine:init', () => {
    Alpine.data('gitModule', function(){
        return {
            documentation: [],
            changes: [],
            showModal: false,
            commitModal: false,
            commitMessage: this.$persist(""),
            selected: this.$persist("README.md"),
            newFile: this.$persist({path: "example.md", content: "#Hello World!\n\nContent here..."}),
            repo: null,
            async init(){
                let repo = await GitRepository.open("https://github.com/bohanssen/assistdummyrepo-model");
                this.repo = repo;
                await this._reload_gui();
                Draftsman.registerTask(this._list_changes.bind(this),0.2);
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
                }
            },
            async save_new_item(){
                this.showModal = false;
                await this.repo.write(this.newFile.path,this.newFile.content);
                await this._reload_gui();
                this.newFile.path = "example.md";
                this.newFile.content = "# Hello World!\n\nContent here..."
            },
            async delete_file(){
                let file = this.$el.getAttribute("file");
                await this.repo.delete(file);
                await this._reload_gui();
            },
            async revert_file(){
                let file = this.$el.getAttribute("file");
                await this.repo.revert(file);
                await this._reload_gui();
            },
            async commit_changes(){
                this.commitModal = false;
                this.repo.commit(this.commitMessage);
            },
            async _list_changes(){
                let changes = await this.repo.status();
                this.changes = changes.filter(x => x.status != "unmodified");
            },
            async _reload_gui(){
                this.documentation = [];
                let files = await this.repo.list();
                this.documentation = files.filter(x => x.endsWith(".md"));
            }
        }
    });
});