document.addEventListener('alpine:init', () => {
  Alpine.data('MicroDocUtils', function(){
    return {

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
    }
  });
});