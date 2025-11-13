document.addEventListener('alpine:init', () => {
  Alpine.data('main', function(){
    return {
        collections: this.$persist([]),
        organisations: [],
        organisation: this.$persist({}),
        documents: this.$persist({}),
        author: this.$persist(""),
        current: this.$persist({}).using(sessionStorage),
        navigation: this.$persist("").using(sessionStorage),
        dashboard_data: {},
        c4_data: this.$persist({}),
        component_index: this.$persist({}),
        component_reverse_index: this.$persist({}),
        node_index: this.$persist({}),
        tags: [],
        miniSearch: null,

        openPath(name) {
          // zoek het element met data-name
          const el = this.$root.querySelector(`[data-name="${name}"]`);
          if (!el) return;

          // loop omhoog door alle parents
          let parent = el.parentElement;
          while (parent) {
            if (parent.tagName.toLowerCase() === 'details') {
              parent.open = true; // open elk bovenliggend details-element
            }
            parent = parent.parentElement;
          }

          // optioneel: scroll in beeld
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        async init(){
            if (!this.author){
                this.author = prompt("Nickname");
            }
            let organisations = this.get_collection('organisations');
            this.organisations = await organisations.keys();

            let navigation = location.hash.replace("#","");
            if (navigation){
                this.navigation = navigation;
            }
            if (this.organisation){
                this.$watch("organisation", async (val) => {
                  await this.update_organisation(val);
                });
                let documents = this.get_collection(`${this.organisation.name}_documents`);
                let keys = await documents.keys()
                for (const key of keys){
                    this.documents[key] = await documents.getItem(key);
                }
                for (const key of Object.keys(this.documents)){
                    if (!keys.includes(key)){
                        delete this.documents[key];
                    }
                }
            }
            window.addEventListener("hashchange", () => {
                let navigation = location.hash.replace("#","");
                if (this.navigation != navigation){
                    this.navigation = navigation;
                    location.reload();
                }
            });
            this.miniSearch = new MiniSearch({
              fields: ['title', 'text'],
              storeFields: ['title', 'type'],
              searchOptions: {
                prefix: true,
                boost: { title: 2 },
                fuzzy: 0.2
              }
            });
            if (this.documents){
                this.index_project(this.documents);
                let index = [];
                let content = this.get_collection(`${this.organisation.name}_content`);
                for (const doc of Object.values(this.documents)){
                    index.push(await prepare_searchable(doc,content));
                }
                this.miniSearch.addAll(index);
            }
        },

        async open_organisation(name){
            let organisations = this.get_collection('organisations');
            if (name == "new"){
                name = prompt("Organisation name:")
                let keys = await organisations.keys();
                if (!keys.includes(this.organisations)){
                    await organisations.setItem(name,{
                        name,
                        decision_index: 0,
                        documents: {
                            "about": {
                                id: "about",
                                createdAt: new Date(),
                                type: "organisation",
                                authors: [this.author],
                                sections: [{
                                    type: "markdown",
                                    id: crypto.randomUUID(),
                                    body: `# ${name}\n\n About this organisation...`
                                }]
                            }
                        }
                    });
                    let documents = this.get_collection(`${name}_documents`);
                    let content = this.get_collection(`${name}_content`);
                    let content_id = crypto.randomUUID();
                    await documents.setItem("about",{
                        id: "about",
                        createdAt: new Date(),
                        type: "organisation",
                        authors: [this.author],
                        sections: [{
                            type: "markdown",
                            id: content_id
                        }]
                    });
                    await content.setItem(content_id, `# ${name}\n\n About this organisation...`);
                }
            }
            console.log(name)
            this.organisation = await organisations.getItem(name);
            console.log(this.organisation)
            this.navigation = "about";
            location = "#about"
            location.reload();
        },
        async update_organisation(){
            if (this.organisation && "name" in this.organisation){
                let organisations = this.get_collection("organisations");
                await organisations.setItem(this.organisation.name,this.organisation);
            }
        },
        async open_document(id){
            if (id in this.documents){
                this.current = {id: "", sections: []};
                await this.$nextTick();
                let documents = this.get_collection(`${this.organisation.name}_documents`);
                let current = await documents.getItem(id);
                let content = this.get_collection(`${this.organisation.name}_content`);
                for (const sec of current.sections){
                    let body = await content.getItem(sec.id);
                    if(body){
                        sec.body = body;
                    }
                }
                this.navigation = id;
                location.hash = "#" + id;
                if (this.unwatchCurrent){
                    this.unwatchCurrent();
                }
                this.current = current;
                this.unwatchCurrent = this.$watch("current", async (val) => {
                  await this.update_document(val);
                });
            } else if (["dashboard",'architecture','all','node-diagram'].includes(id)){
                this.current = {id: "", sections: []};
                this.navigation = id;
                location.hash = "#" + id;
            }
        },
        async update_document(){
            await this.update_document_inline(this.current)
        },

        async update_document_inline(current){
            if ("id" in current && current.id != ""){
                let doc = JSON.parse(JSON.stringify(current));
                if (!doc.authors.includes(this.author)){
                    doc.authors.push(this.author)
                }
                doc.updatedAt = new Date();

              if ("sections" in doc) {
                let content_collection = this.get_collection(`${this.organisation.name}_content`);
                for (const section of doc.sections){
                    if ("body" in section && "id" in section) {
                        let body = await content_collection.getItem(section.id);
                        if (body != section.body){
                            await content_collection.setItem(section.id, section.body);
                            enqueueChange({type: 'section', section})
                        }
                        delete section.body;
                      }
                }
              }
              let document_collection = this.get_collection(`${this.organisation.name}_documents`);
              await document_collection.setItem(current.id, doc);
            }
        },

        index_project(documents){
            // Dashboard Hillchart
            let data = {};
            let tags = [];
            Object.values(documents).filter(doc => doc.type == 'scope').forEach(doc => {
                let project = documents[doc.parent].title;
                if (!(project in data)){
                    data[project] = {"id": doc.parent, "name": project, "progress": []};
                }
                data[project]["progress"].push(doc.attributes.progress);
            });
            data = Object.values(data);
            data.forEach(x => {
                x.progress = x.progress.length ? x.progress.reduce((a, b) => a + b, 0) / x.progress.length : 0;
            });
            this.dashboard_data["hillchart"] = data;

            // C4 components
            let arch = {
                components: {},
                edges: [],
            };
            Object.values(documents).filter(doc => "effect" in doc).filter(doc => doc.effect).forEach(doc => {
                let effect = doc.effect;
                if (effect.action == "introduces new"){
                    if (effect.level == "system"){
                        arch.components[effect.system_name] = {
                            scope: effect.scope,
                            description: effect.description,
                            technology: effect.technology,
                            id: doc.id
                        }
                        tags.push(effect.system_name);
                        this.component_index[effect.system_name] = doc.id;
                        this.component_reverse_index[doc.id] = effect.system_name;
                    }
                    if (effect.level == "container"){
                        arch.components[effect.scope + ":" + effect.system_name] = {
                            name: effect.system_name,
                            type: effect.type,
                            description: effect.description,
                            technology: effect.technology,
                            id: doc.id
                        }
                        tags.push(effect.scope + ":" + effect.system_name);
                        this.component_index[effect.scope + ":" + effect.system_name] = doc.id;
                        this.component_reverse_index[doc.id] = effect.scope + ":" + effect.system_name;
                    }
                    if (effect.level == "component"){
                        arch.components[effect.scope + ":" + effect.system_name] = {
                            name: effect.system_name,
                            description: effect.description,
                            technology: effect.technology,
                            id: doc.id
                        }
                        tags.push(effect.scope + ":" + effect.system_name);
                        this.component_index[effect.scope + ":" + effect.system_name] = doc.id;
                        this.component_reverse_index[doc.id] = effect.scope + ":" + effect.system_name;
                    }
                } else if (effect.action == "link two components"){
                    let edge = {...effect};
                    edge.source = Object.keys(this.component_index).find(k => this.component_index[k] === effect.source);
                    edge.target = Object.keys(this.component_index).find(k => this.component_index[k] === effect.target);
                    arch.edges.push(edge);
                } else if (effect.action == "new persona"){
                    arch.components["persona:" + effect.name] = {
                        name: effect.name,
                        description: effect.description,
                        external: effect.external,
                        id: doc.id,
                        type: "persona"
                    };
                    this.component_index["persona:" + effect.name] = doc.id;
                    this.component_reverse_index[doc.id] = "persona:" + effect.name;
                }
            });

            if (JSON.stringify(arch) != JSON.stringify(this.c4_data)){
                this.c4_data = arch;
            }
            arch.edges.forEach(x => {
                if (!(x.source in this.component_index)){
                    x.source = Object.keys(this.component_index).find(k => this.component_index[k] === x.source);
                }
                if (!(x.target in this.component_index)){
                    x.target = Object.keys(this.component_index).find(k => this.component_index[k] === x.target);
                }
            });
            Object.values(documents).filter(x => 'tags' in x && x.tags.length != 0).forEach(doc => {
                doc.tags.forEach(t => {
                    if (!tags.includes(t)){
                        tags.push(t);
                    }
                });
            });
            this.tags = tags;

            Object.values(documents).filter(doc => doc.id != "about").forEach(doc => {
                let id = doc.id
                this.make_sure_node_exists(id);
                this.node_index[doc.id].title = doc.title;
                if ("parent" in doc && doc.parent){
                    this.node_index[doc.id].inbound[doc.parent] = "child of";
                    this.make_sure_node_exists(doc.parent);
                    this.node_index[doc.parent].outbound[doc.id] = "parent of";
                }
                doc.sections.filter(x => x.type == "reference" && "document" in x && x.document).forEach(section => {
                    this.node_index[doc.id].outbound[section.document] = "references";
                    this.make_sure_node_exists(section.document);
                    this.node_index[section.document].inbound[doc.id] = "referenced by";
                });
                if ("precedent" in doc && doc.precedent){
                    this.node_index[doc.id].inbound[doc.precedent] = "references";
                    this.make_sure_node_exists(doc.precedent);
                    this.node_index[doc.precedent].outbound[doc.id] = "referenced by";
                }
                if ("effect" in doc && doc.effect.action == "link two components"){
                    if ("source" in doc.effect && doc.effect.source){
                        this.node_index[doc.id].inbound[doc.effect.source] = "references";
                        this.make_sure_node_exists(doc.effect.source);
                        this.node_index[doc.effect.source].outbound[doc.id] = "referenced by";
                    }
                    if ("target" in doc.effect && doc.effect.target){
                        this.node_index[doc.id].inbound[doc.effect.target] = "references";
                        this.make_sure_node_exists(doc.effect.target);
                        this.node_index[doc.effect.target].outbound[doc.id] = "referenced by";
                    }
                }
            });
        },
        make_sure_node_exists(id){
            if (!(id in this.node_index)){
                this.node_index[id] = {inbound: {}, outbound: {}};
            }
        },
        load_data(event) {
          const file = event?.target?.files?.[0];

          if (!file) {
            console.warn("⚠️ No file selected.");
            return;
          }

          const reader = new FileReader();

          reader.onload = async (e) => {
            try {
              const newData = JSON.parse(e.target.result);

              // ✅ bestaande data behouden, nieuwe toevoegen of overschrijven
              const org_collection = this.get_collection("organisations");

              for (const [key, value] of Object.entries(newData)) {
                const { documents, ...org } = value;

                // Organisatie-level metadata
                await org_collection.setItem(key, org);

                // Sub-collecties per organisatie
                const document_collection = this.get_collection(`${key}_documents`);
                const content_collection = this.get_collection(`${key}_content`);

                for (const [id, doc] of Object.entries(documents)) {
                  let document = { ...doc };

                  if ("sections" in document) {
                    document.sections.forEach(section => {
                      if ("body" in section) {
                        content_collection.setItem(section.id, section.body);
                        delete section.body;
                      }
                    });
                  }
                  await document_collection.setItem(id, document);
                }
              }
              console.log("✅ Local data loaded:", this.organisations);

              let organisations = this.get_collection("organisations");
              let org = await organisations.keys();
              await this.open_organisation(org[0]);
            } catch (err) {
              console.error("❌ Failed to parse file:", err);
            }
          };

          reader.readAsText(file);
        },
        get_collection(name){
            if (!name || typeof name !== "string") {
                throw new Error(`❌ Invalid collection name: ${name}`);
              }

              if (name.startsWith("undefined_")) {
                throw new Error(`❌ Invalid collection name prefix: "${name}" — likely missing organisation context`);
              }
            if (!this.collections.includes(name)){
                this.collections.push(name);
            }
            return localforage.createInstance({name:'workbench',storeName: name});
        },
        async export_data(){
            let data = {};
            let org_collection = this.get_collection("organisations");
            let keys = await org_collection.keys();
            for (org of keys){
                data[org] = await org_collection.getItem(org);
                data[org].documents = {};
                let documents = this.get_collection(`${org}_documents`);
                let content = this.get_collection(`${org}_content`);
                let docs = await documents.keys();
                for (doc of docs){
                  data[org].documents[doc] = await documents.getItem(doc);
                  for (section of data[org].documents[doc].sections){
                    let body = await content.getItem(section.id);
                    if (body){
                        section.body = body;
                    }
                  }
                }
            }
            const jsonStr = JSON.stringify(data, null, 2);

            // 2️⃣ Maak een blob
            const blob = new Blob([jsonStr], { type: 'application/json' });

            // 3️⃣ Maak een tijdelijke download-link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "worbench-export.json";

            // 4️⃣ Trigger de download
            document.body.appendChild(a);
            a.click();

            // 5️⃣ Opruimen
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        clear_storage(){
              this.collections.forEach(c => {
                var collection = this.get_collection(c);
                collection.clear();
              });
              this.collections = [];
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }
  });
});

function weeksFromNow(weeks) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + weeks * 7);
  return endDate;
}

function workdaysUntil(targetDateStr) {
  const start = new Date();                     // vandaag
  const end = new Date(targetDateStr);          // doel-datum
  let count = 0;

  // als einddatum in het verleden ligt, return 0
  if (end < start) return 0;

  // van vandaag tot einddatum (inclusief einddatum)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0 = zondag, 6 = zaterdag
    if (day !== 0 && day !== 6) {
      count++;
    }
  }

  return count;
}

async function prepare_searchable(doc,content){
    let text = "";
    if ("sections" in doc){
        for (const sec of doc.sections){
            let body = await content.getItem(sec.id);
            if (body){
                text += "\n\n" + body;
            }
        }
    }
    if ("principle" in doc){
        text += "\n\n" + doc.principle;
    }
    if ("decision" in doc){
        text += "\n\n" + doc.decision;
    }
    return {
        id: doc.id,
        title: doc.title,
        text
    }
}

function convert_y(y){
    if (!y){return ""}
    return `In the context of ${y.context || '…'}, ` +
                  `facing ${y.concern || '…'}, ` +
                  `we decided for ${y.decision || '…'} ` +
                  `and discarded ${y.alternatives || '…'}, ` +
                  `to achieve ${y.quality || '…'}, ` +
                  `accepting the consequence of ${y.consequence || '…'}.`;
}
