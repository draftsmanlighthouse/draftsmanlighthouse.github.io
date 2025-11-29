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
            if (this.readonly){return}
            try{
            this.editor = new toastui.Editor({
                el: this.$refs.editor,
                height: '100%',
                initialEditType: 'markdown',
                previewStyle: 'vertical',
                initialValue: this.content,
                usageStatistics: false,
                customHTMLRenderer: {
                    htmlBlock: {
                        iframe(node) {
                            return [
                                { type: 'openTag', tagName: 'iframe', outerNewLine: true },
                                { type: 'html', content: node.literal },
                                { type: 'closeTag', tagName: 'iframe', outerNewLine: true }
                            ];
                        }
                    }
                }
            });

            // Voeg spellcheck toe aan de textarea
            const textarea = this.$refs.editor.querySelector('textarea');
            if (textarea) {
                textarea.setAttribute('spellcheck', 'true');
            }

            // Realtime update
            this.editor.on('change', () => {
                this.content = this.editor.getMarkdown();
            });
            }catch{
                console.debug("could not init markdown editor")
            }
        },
        toggleMode() {
          if (this.readonly){return}
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