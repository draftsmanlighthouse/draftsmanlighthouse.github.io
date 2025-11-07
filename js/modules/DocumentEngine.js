document.addEventListener('alpine:init', () => {
  Alpine.data('main', function(){
    return {
        collections: this.$persist([]),
        organisations: this.$persist({}),
        organisation: this.$persist({}),
        documents: this.$persist({}),
        author: this.$persist(""),
        current: this.$persist({}).using(sessionStorage),
        navigation: this.$persist("").using(sessionStorage),
        dashboard_data: {},
        c4_data: {},
        component_index: {},
        component_reverse_index: {},
        node_index: {},
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

        init(){
            if (!this.author){
                this.author = prompt("Nickname");
            }
            this.$watch("current",this.update_document.bind(this));
            if (this.organisation){
                this.unwatchDocuments = this.$watch("documents", this.update_org.bind(this));
            }

            let navigation = location.hash.replace("#","");
            if (navigation){
                this.navigation = navigation;
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
                let index = Object.values(this.documents).map(doc => prepare_searchable(doc));
                this.miniSearch.addAll(index);
            }
        },

        open_organisation(name){
            if (name == "new"){
                name = prompt("Organisation name:")
                if (!(name in this.organisations)){
                    this.organisations[name] = {
                        name,
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
                    }
                }
            }
            if (this.unwatchDocuments) {
                this.unwatchDocuments();
            }
            this.organisation = this.organisations[name];
            this.documents = this.organisation.documents;
            this.navigation = "about";
            location.reload();
            //this.unwatchDocuments = this.$watch("documents", this.update_org.bind(this));
        },

        update_org(){
            if ("name" in this.organisation){
                this.organisation.documents = this.documents;
                this.organisations[this.organisation.name] = this.organisation;
            }
        },

        open_document(id){
            if (id in this.documents){
                this.current = {id: "", sections: []};
                this.$nextTick(() => {
                    this.current = this.documents[id];
                    this.navigation = id;
                    location.hash = "#" + id;
                });
            } else if (["dashboard",'architecture','all','node-diagram'].includes(id)){
                this.current = {id: "", sections: []};
                this.navigation = id;
                location.hash = "#" + id;
            }
        },
        update_document(){
            if ("id" in this.current && this.current.id != ""){
                let doc = JSON.parse(JSON.stringify(this.current));
                if (!doc.authors.includes(this.author)){
                    doc.authors.push(this.author)
                }
                doc.updatedAt = new Date();
                this.documents[doc.id] = doc;
            }
        },

        update_document_inline(current){
            if ("id" in current && current.id != ""){
                let doc = JSON.parse(JSON.stringify(current));
                if (!doc.authors.includes(this.author)){
                    doc.authors.push(this.author)
                }
                doc.updatedAt = new Date();
                this.documents[doc.id] = doc;
            }
        },

        create_pitch(){
            const id = crypto.randomUUID();
            this.documents[id] = {
                id: id,
                createdAt: new Date(),
                type: "pitch",
                status: "draft",
                authors: [this.author],
                title: "",
                sections: [{
                    type: "markdown",
                    id: crypto.randomUUID(),
                    body: ""
                }],
                attributes: {
                    appetite: 6
                },
                tags: ["pitch"]
            };
            this.open_document(id);
        },

        create_scope(parent){
            const id = crypto.randomUUID();
            this.documents[id] = {
                id: id,
                createdAt: new Date(),
                parent: parent,
                type: "scope",
                status: "active",
                authors: [this.author],
                title: "",
                sections: [{
                    type: "markdown",
                    id: crypto.randomUUID(),
                    body: ""
                }],
                attributes: {
                    progress: 0
                },
                tags: ["scope"]
            };
            this.open_document(id);
        },
        create_decision(parent){
            const id = crypto.randomUUID();
            if (!('decision_index' in this.organisation) || !this.organisation.decision_index){
                this.organisation.decision_index = 0;
            }
            this.organisation.decision_index += 1;
            this.documents[id] = {
                id: id,
                sequence_number: this.organisation.decision_index,
                createdAt: new Date(),
                parent: parent,
                type: "DD",
                status: "init",
                authors: [this.author],
                title: "Decision " + this.organisation.decision_index,
                sections: [{
                    type: "markdown",
                    id: crypto.randomUUID(),
                    body: "# Problem statement\n\nDescribe the problem you are solving..."
                },{
                    type: "markdown",
                    id: crypto.randomUUID(),
                    body: "# Decision\n\nDescribe the decision that is taken..."
                }],
                tags: ["decision"]
            };
            location.reload();
        },
        toggle_decision(){
            if (this.current.type == "DD"){
                this.current.type = "ADR";
                delete this.current.decision;
                this.current.ystatement = {
                  context: '',
                  concern: '',
                  decision: '',
                  alternatives: '',
                  quality: '',
                  consequence: ''
                }
            } else {
                this.current.type = "DD";
                const y = this.current.ystatement || {};
                this.current.decision = convert_y(y);
                delete this.current.ystatement;
            }
        },
        create_principle(parent){
            const id = crypto.randomUUID();
            this.documents[id] = {
                id: id,
                createdAt: new Date(),
                parent: parent,
                type: "principle",
                scope: "enterprise",
                status: "init",
                authors: [this.author],
                title: "EAP #: summary",
                principle: PRINCIPLE,
                sections: [],
                tags: ["principle"]
            };
            location.reload();
        },
        create_persona(parent){
            const id = crypto.randomUUID();
            this.documents[id] = {
                id: id,
                createdAt: new Date(),
                parent: parent,
                type: "persona",
                status: "init",
                authors: [this.author],
                title: "Persona: XYZ",
                sections: [{
                    type: "markdown",
                    id: crypto.randomUUID(),
                    body: "# XYZ\n\nDescribe the persona..."
                }],
                effect: {
                    action: "new persona",
                    external: false,
                    name: "new-persona",
                    description: "description"
                },
                tags: ["persona"]
            };
            location.reload();
        },
        get_work_items(documents) {
            const complete_state = ["decided","rejected","published","deleted"];

            return Object.values(documents)
                .filter(x => x.parent === this.current.id)
                .sort((a, b) => {
                    // 1️⃣ Onvoltooide boven voltooide
                    const aComplete = complete_state.includes(a.status);
                    const bComplete = complete_state.includes(b.status);
                    if (aComplete !== bComplete) {
                        return aComplete ? 1 : -1; // complete gaat naar beneden
                    }

                    // 2️⃣ Binnen elke groep sorteren op prio (0 bovenaan)
                    return (a.prio ?? 99) - (b.prio ?? 99);
                });
        },
        get_referable_decisions(documents){
            let types = ["ADR","principle"];
            let status = ["decided","published"];
            return Object.values(documents).filter(x => types.includes(x.type)).filter(x => status.includes(x.status));
        },
        filter_decisions(documents,level){
            let decisions = Object.values(documents).filter(x => x.type == 'DD' || x.type == 'ADR');
            if (level == "enterprise"){
                return decisions;
            }
            let retval = [];
            let pre = level.replace("enterprise:","");
            decisions.forEach(decision => {
                if ("source" in decision.effect && decision.effect.source.startsWith(pre)){
                    retval.push(decision);
                } else if ("target" in decision.effect && decision.effect.target.startsWith(pre)){
                    retval.push(decision);
                } else if ("system_name" in decision.effect && level.endsWith(decision.effect.system_name)){
                    retval.push(decision);
                } else if ("system_name" in decision.effect && level.split(":").length == 2 && level.includes(decision.effect.scope)){
                    retval.push(decision);
                }
            })
            return retval;
        },

        start_cycle(){
            Object.values(this.documents).filter(doc => doc.type == 'pitch').filter(doc => ['proposed','queued'].includes(doc.status)).forEach(doc => {
                let mapping = {
                    proposed: "rejected",
                    queued: "accepted"
                }
                doc.status = mapping[doc.status];
            });
            location.reload();
        },

        start_project(){
            const deadline = weeksFromNow(this.current.attributes.appetite);
            this.current.attributes.deadline = deadline.toISOString().split('T')[0];
            this.current.status = "inprogress";
            location.reload();
        },

        add_markdown_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "markdown",
                body: ""
            });
        },
        add_drawio_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "drawio",
                body: ""
            });
        },
        add_sketch_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "sketch",
                body: ""
            });
        },
        add_mermaid_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "mermaid",
                body: ""
            });
        },
        add_chart_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "chart",
                body: ""
            });
        },
        add_reference_section(){
            const id = crypto.randomUUID();
            this.current.sections.push({
                id: id,
                type: "reference",
                document: "",
                sections: [],
                version: "latest"
            });
        },
        removeSection(section){
            this.current.sections = this.current.sections.filter(x => x.id != section.id);
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

              // Update Alpine-state (optioneel)
              this.organisations = {
                ...this.organisations,
                ...newData
              };

              console.log("✅ Local data loaded:", this.organisations);

              let org = Object.keys(this.organisations)[0];
              // this.open_organisation(org);
            } catch (err) {
              console.error("❌ Failed to parse file:", err);
            }
          };

          reader.readAsText(file);
        },
        get_collection(name){
            if (!this.collections.includes(name)){
                this.collections.push(name);
            }
            return localforage.createInstance({name: name});
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
//            if (this.unwatchDocuments) {
//                this.unwatchDocuments();
//            }
//            this.author = "";
//            this.documents = {};
//            this.current = {};
//            this.organisations = {};
//            this.organisation = {};
//            location.reload();
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

function prepare_searchable(doc){
    let text = "";
    if ("sections" in doc){
        doc.sections.forEach(s => {
            text += "\n\n" + s.body;
        });
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
