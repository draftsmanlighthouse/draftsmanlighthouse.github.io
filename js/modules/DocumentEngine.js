document.addEventListener('alpine:init', () => {
  Alpine.data('main', function(){
    return {
        documents: this.$persist({}),
        author: this.$persist(""),
        current: this.$persist({}),

        init(){
            if (!this.author){
                this.author = prompt("Nickname");
            }
            this.$watch("current",this.update_document.bind(this))
        },

        open_document(id){
            if (id in this.documents){
                this.current = {};
                this.$nextTick(() => {
                    this.current = this.documents[id];
                });
            }
        },
        update_document(){
            if ("id" in this.current){
                if (!this.current.authors.includes(this.author)){
                    this.current.authors.push(this.author)
                }
                this.documents[this.current.id] = this.current;
            }
        },

        create_pitch(){
            const id = crypto.randomUUID();
            this.documents[id] = {
                id: id,
                type: "pitch",
                status: "draft",
                authors: [this.author],
                title: "",
                problem: "",
                appetite: 6,
                solution: [],
                risks: [],
                nogo: []
            };
        },

        load_data(){
            fetch("/js/config/test-data.json")
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
              })
              .then(newData => {
                // ✅ bestaande data behouden, nieuwe toevoegen of overschrijven
                this.documents = {
                  ...this.documents,
                  ...newData
                };
                console.log("✅ Documents updated:", this.documents);
              })
              .catch(err => {
                console.error("❌ Failed to load test data:", err);
              });
        },
        clear_storage(){
            this.author = "";
            this.documents = {};
            this.current = {};
        }
    }
  });
});