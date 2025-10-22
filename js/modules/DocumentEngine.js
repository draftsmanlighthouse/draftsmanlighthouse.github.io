document.addEventListener('alpine:init', () => {
  Alpine.data('main', function(){
    return {
        organisations: this.$persist({}),
        organisation: this.$persist({}),
        documents: this.$persist({}),
        author: this.$persist(""),
        current: this.$persist({}).using(sessionStorage),
        navigation: this.$persist("").using(sessionStorage),
        dashboard_data: {},

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
            if (this.documents){
                this.index_project(this.documents);
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
            } else if (["dashboard",'architecture'].includes(id)){
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
                }
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
                }
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
                status: "draft",
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
                }]
            };
            location.reload();
        },
        get_work_items(documents) {
            const complete_state = ["decided","rejected"];

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
        removeSection(section){
            this.current.sections = this.current.sections.filter(x => x.id != section.id);
        },

        index_project(documents){
            let data = {};
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
                this.organisations = {
                  ...this.organisations,
                  ...newData
                };
                console.log("✅ Data updated:", this.organisations);
                let org = Object.keys(this.organisations)[0];
                this.open_organisation(org);
              })
              .catch(err => {
                console.error("❌ Failed to load test data:", err);
              });
        },
        clear_storage(){
            if (this.unwatchDocuments) {
                this.unwatchDocuments();
            }
            this.author = "";
            this.documents = {};
            this.current = {};
            this.organisations = {};
            this.organisation = {};
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