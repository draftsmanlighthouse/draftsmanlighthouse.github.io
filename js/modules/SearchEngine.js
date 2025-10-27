document.addEventListener('alpine:init', () => {
  Alpine.data('SearchEngine', function(){
    return {
        selectedTags: this.$persist([]),
        groupedTags: {},
        search: this.$persist("").as("fullTextSearch"),
        prefilter: this.$persist([]),
        results: [],
        init(){
            this.$watch("search",this.execute_pre_filter.bind(this));
        },
        clear_filters(){
            this.selectedTags = [];
            this.search = "";
        },
        execute_pre_filter(){
            let results = this.miniSearch.search(this.search)
            this.prefilter = results.map(x => x.id);
        },
        prepare(tags){
            const sorted = [...tags].sort((a, b) => a.localeCompare(b));
            // groeperen per eerste letter
            const grouped = {};
            for (const tag of sorted) {
              const letter = tag[0].toUpperCase();
              if (!grouped[letter]) grouped[letter] = [];
              grouped[letter].push(tag);
            }
            this.selectedTags = this.selectedTags.filter(tag => tags.includes(tag));
            this.groupedTags = grouped;
        },
        filter(documents, selectedTags, prefilter) {
          let filtered = Object.values(documents);
          if (prefilter.length > 0){
            filtered = filtered.filter(x => prefilter.includes(x.id));
          }
          if (selectedTags.length > 0) {
            filtered = filtered.filter(doc => {
              let tags = Array.isArray(doc.tags) ? [...doc.tags] : [];
              if (["DD","ADR"].includes(doc.type) && 'effect' in doc){

                function add_tags(arn) {
                  if (!arn) return;

                  const parts = arn.split(":");
                  let current = "";

                  for (const part of parts) {
                    current = current ? `${current}:${part}` : part;
                    tags.push(current);
                  }
                }
                if ("source" in doc.effect){
                    add_tags(doc.effect.source);
                }
                if ("target" in doc.effect){
                    add_tags(doc.effect.target);
                }
                if ("system_name" in doc.effect){
                    let scope = !["internal","external"].includes(doc.effect.scope) ? doc.effect.scope + ":" : ""
                    add_tags(scope + doc.effect.system_name);
                }
              }
              return selectedTags.every(tag => tags.includes(tag));
            });
          }

          this.results = filtered.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        }
    }
  });
});