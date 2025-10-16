document.addEventListener('alpine:init', () => {
  Alpine.data('markdown', function(){
    return {
        editor: null,
        isEditing: false,
        renderedMarkdown: '',
        init(){
            if (!this.content){
                this.content = '# Welcome to Markdown Editor\n\nType something...';
            }
            this.renderedMarkdown = marked.parse(this.content);
            // Init Toast UI Editor
            this.editor = new toastui.Editor({
                el: this.$refs.editor,
                height: '100%',
                initialEditType: 'markdown',
                previewStyle: 'vertical',
                initialValue: this.content,
                usageStatistics: false
            });

            // Realtime update
            this.editor.on('change', () => {
                this.content = this.editor.getMarkdown();
            });
        },
        toggleMode() {
          this.isEditing = !this.isEditing;
          if (!this.isEditing) {
            this.content = this.editor.getMarkdown();
            this.renderedMarkdown = marked.parse(this.content);
          } else {

          }
        }
    }
  });
});