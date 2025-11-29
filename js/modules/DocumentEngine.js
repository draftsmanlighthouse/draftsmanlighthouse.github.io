document.addEventListener("alpine:init", () => {
  Alpine.data("main", function () {
    return {
      notebooks: {},
      notebook: "",
      permissionIssue: false,
      navigation: this.$persist("doc"),
      index: {
        documents: {},
        navigation: [],
        lineage: {},
      },
      node_index: this.$persist({}),
      history: this.$persist([]),

      c4_data: this.$persist({}),
      component_index: this.$persist({}),
      component_reverse_index: this.$persist({}),

      openState: this.$persist({}).as("nav-open-state"),

      tags: this.$persist([]),
      menuHTML: "",
      microDoc: {},
      miniSearch: null,

      saveTimeout: null,
      debounceDelay: 1000,
      saving: false,
      pendingSave: false,

      layout_names: {
            A: "Two Equal Columns",
            B: "Left Emphasis",
            C: "Right Emphasis",
            D: "Left + Two Stack",
            E: "Two Stack + Right",
            F: "Quarter Grid",
            G: "Hero Slide",
            H: "Hero + Two",
            I: "Two + Hero",
            J: "Hero + Three",
            K: "Three Columns",
            L: "Six Grid",
            M: "Nine Grid",
            N: "Asymmetric Quad",
            O: "Three + Hero"
        },

      async init() {
        await idb.init();
        await this.restoreNotebooks();
      },

      //---------------------------------------------------------------------
      // RESTORE FROM INDEXEDDB
      //---------------------------------------------------------------------
      async restoreNotebooks() {
        const entries = await idb.getAll();
        this.notebooks = {};

        for (const entry of entries) {
          this.notebooks[entry.id] = entry;
        }

        if (localStorage.lastNotebook && this.notebooks[localStorage.lastNotebook]) {
          this.notebook = localStorage.lastNotebook;
          await this.openNotebook(this.notebook);
        }

        if (localStorage.lastDocument && this.index.documents[localStorage.lastDocument]){
            if (this.navigation == "doc"){
                await this.open_doc(localStorage.lastDocument);
            }
        }
      },

      //---------------------------------------------------------------------
      // IMPORT NOTEBOOK (Add folder)
      //---------------------------------------------------------------------
      async importNotebook() {
        try {
          const handle = await window.showDirectoryPicker({
            mode: "readwrite"
          });

          await this.verifyPermissions(handle);

          const id = "notebook-" + crypto.randomUUID();
          const entry = { id, name: handle.name, handle };

          this.notebooks[id] = entry;
          await idb.save(id, entry);

          localStorage.lastNotebook = id;
          this.notebook = id;

          await this.openNotebook(id);

        } catch (err) {
          console.error("importNotebook error:", err);
        }
      },

      //---------------------------------------------------------------------
      // OPEN NOTEBOOK (load all small JSON files)
      //---------------------------------------------------------------------
      async openNotebook(id) {
        if (id === "new/import") {
          return await this.importNotebook();
        }
        if (id == "soft delete"){
            await this.remove(this.notebook);
            return;
        }

        if (this.notebook && this.notebook != id){
            this.history = [];
            // de rest ook resetten
        }
        this.notebook = id;
        localStorage.lastNotebook = id;

        const entry = this.notebooks[id];
        if (!entry) return;

        const dir = entry.handle;

        await this.verifyPermissions(dir);

        await this.indexFiles(dir);

        console.log("Loaded notebook", id, this.files);
      },

      //---------------------------------------------------------------------
      // LOAD ALL SMALL FILES
      //---------------------------------------------------------------------
      async indexFiles(dir) {
          const start = performance.now();     // <- START TIMER
          const searchIndex = [];
          const sectionIndex = [];
          const index = {
            documents: {},
            navigation: [],
            lineage: {},
          };
          const node_index = {}

          function make_sure_node_exists(id){
                if (!(id in node_index)){
                    node_index[id] = {inbound: {}, outbound: {}};
                }
            }
          for await (const [name, handle] of dir.entries()) {

            if (handle.kind === "directory") {
              try {
                const indexHandle = await handle.getFileHandle("index.json");
                const file = await indexHandle.getFile();
                const text = await file.text();

                let json = {};
                try {
                  json = JSON.parse(text);
                } catch {
                  json = text;
                }

                index.documents[name] = {
                  id: name,
                  type: json.type || "note",
                  name: json.name || name,
                  parent: json.parent || "",
                  sections: json.sections || [],
                  tags: json.tags || [],
                  decision: json.decision || "",
                  principle: json.principle || "",
                  ystatement: json.ystatement || {},
                  status: json.status || "draft",
                  scope: json.scope || "",
                  updated: json.updated || 0
                };
                if ("effect" in json){
                    index.documents[name].effect = json.effect;
                }

                // Register lineage
                if (json.parent) {
                  if (!(json.parent in index.lineage)) {
                    index.lineage[json.parent] = [];
                  }
                  index.lineage[json.parent].push(name);
                }

                // Prepare search
                let searchText = "";
                for (const section of json.sections){
                    if (section.type == "markdown"){
                        const markdownHandle = await handle.getFileHandle(section.id + ".md");
                        const markdownFile = await markdownHandle.getFile();
                        const data = await markdownFile.text();
                        searchText += " " + data;
                        sectionIndex.push({
                            id: json.id+section.id,
                            short_id: shortId(section.id),
                            section_id: section.id,
                            parent_id: json.id,
                            parent_name: json.name,
                            type: "markdown",
                            tags: json.tags.join(" ") || "",
                            data
                        });
                    } else if (section.type != "reference" && section.type != "slide") {
                        // TODO: add captions to visual sections
                        sectionIndex.push({
                            id: json.id+section.id,
                            section_id: section.id,
                            short_id: shortId(section.id),
                            parent_id: json.id,
                            parent_name: json.name,
                            type: section.type,
                            tags: json.tags.join(" ") || "",
                            data: section.caption || ""
                        });
                    }
                }

                // Update node index
                let id = json.id
                make_sure_node_exists(id);
                node_index[id].title = json.name;
                json.sections.filter(x => x.type == "slide").forEach(section => {
                      Object.values(section.sections).forEach(sec => {
                        if (sec.parent != id){
                            node_index[id].outbound[sec.parent] = "references";
                            make_sure_node_exists(sec.parent);
                            node_index[sec.parent].inbound[id] = "referenced by";
                        }
                      });
                });
                json.sections.filter(x => x.type == "reference" && "document" in x && x.document).forEach(section => {
                    node_index[id].outbound[section.document] = "references";
                    make_sure_node_exists(section.document);
                    node_index[section.document].inbound[id] = "referenced by";
                });
                if ("parent" in json && json.parent){
                    node_index[id].inbound[json.parent] = "child of";
                    make_sure_node_exists(json.parent);
                    node_index[json.parent].outbound[json.id] = "parent of";
                }
                if ("precedent" in json && json.precedent){
                    node_index[id].inbound[json.precedent] = "guided by";
                    make_sure_node_exists(json.precedent);
                    node_index[json.precedent].outbound[id] = "guides";
                }
                if ("effect" in json && json.effect.action == "link two components"){
                    if ("source" in json.effect && json.effect.source){
                        node_index[id].outbound[json.effect.source] = "links to";
                        make_sure_node_exists(json.effect.source);
                        node_index[json.effect.source].inbound[id] = "linked from";
                    }
                    if ("target" in json.effect && json.effect.target){
                        node_index[id].outbound[json.effect.target] = "links to";
                        make_sure_node_exists(json.effect.target);
                        node_index[json.effect.target].inbound[id] = "linked from";
                    }
                }
                this.node_index = node_index;
                searchIndex.push({
                    id: json.id,
                    title: json.name,
                    text: searchText
                });
              } catch (err) {
                console.log("Skip! -->",err)
                // geen index.json? → skip
              }
            }
          }

          const parseEnd = performance.now();     // timing van alleen dir-scan + JSON parse

          function buildTree(documents) {
            const children = {};

            Object.values(documents).forEach(doc => {
              const parent = doc.parent || "_root";
              if (!children[parent]) children[parent] = [];
              children[parent].push(doc);
            });

            Object.values(children).forEach(list => {
              list.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
            });

            function buildNode(node) {
              return {
                id: node.id,
                name: node.name,
                documents: (children[node.id] || []).map(buildNode),
                status: node.status
              };
            }

            const roots = children["_root"] || [];
            return roots.map(buildNode);
          }

          index.navigation = buildTree(index.documents);

          const treeEnd = performance.now();    // timing tot en met boom-opbouw

          // C4 components
          const tags = [];
            let arch = {
                components: {},
                edges: [],
            };
            Object.values(index.documents).filter(doc => "effect" in doc).filter(doc => doc.effect).forEach(doc => {
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
                    edge.source = this.component_reverse_index[effect.source];
                    edge.target = this.component_reverse_index[effect.target];
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
                    x.source = this.component_reverse_index[x.source];
                }
                if (!(x.target in this.component_index)){
                    x.target = this.component_reverse_index[x.target];
                }
            });

          // Index tags
          Object.values(index.documents).filter(x => 'tags' in x && x.tags.length != 0).forEach(doc => {
                doc.tags.forEach(t => {
                    if (!tags.includes(t)){
                        tags.push(t);
                    }
                });
            });
            this.tags = tags;

          this.miniSearch = new MiniSearch({
              fields: ['title', 'text'],
              storeFields: ['title', 'type'],
              searchOptions: {
                prefix: true,
                boost: { title: 10 },
                fuzzy: 0.2
              }
            });
          this.miniSearch.addAll(searchIndex);
          this.sectionIndex = new MiniSearch({
              fields: ['parent_name', 'type', 'data', 'tags','short_id'],
              storeFields: ['id', 'section_id', 'parent_id', 'parent_name', 'type','short_id'],
              searchOptions: {
                prefix: true,
                boost: { title: 10 },
                fuzzy: 0.2
              }
            });
          this.sectionIndex.addAll(sectionIndex);
          const contentIndexEnd = performance.now();    // timing tot en met boom-opbouw

          this.index = index;
          this.menuHTML = buildMenuHTML(this.index.navigation);

          let keys = Object.keys(this.index.documents);
          this.history = this.history.filter(x => keys.includes(x));
          const totalEnd = performance.now();   // totaal
          // -------------------------
          // LOGGING (high-resolution)
          // -------------------------
          console.log(
            `%c[indexFiles] Directory scan + JSON parse: ${(parseEnd - start).toFixed(2)} ms`,
            "color:#4ade80"
          );
          console.log(
            `%c[indexFiles] Build tree: ${(treeEnd - parseEnd).toFixed(2)} ms`,
            "color:#60a5fa"
          );
          console.log(
            `%c[indexFiles] Index content: ${(contentIndexEnd - treeEnd).toFixed(2)} ms`,
            "color:#008080"
          );
          console.log(
            `%c[indexFiles] Total time: ${(totalEnd - start).toFixed(2)} ms`,
            "color:#facc15; font-weight:bold"
          );
        },

      //---------------------------------------------------------------------
      // CREATE NEW DOCUMENT IN FOLDER
      //---------------------------------------------------------------------
      async create_doc() {
          const entry = this.notebooks[this.notebook];
          if (!entry) return;

          const dir = entry.handle;
          await this.verifyPermissions(dir);

          // 1. Maak directory voor document
          const id = crypto.randomUUID();
          const docDir = await dir.getDirectoryHandle(id, { create: true });

          // 2. Maak index.json in die map
          const indexHandle = await docDir.getFileHandle("index.json", { create: true });

          const defaultContent = {
            id,
            name: "New note",
            status: "draft",
            created: Date.now(),
            updated: Date.now(),
            type: "note",
            parent: "",
            sections: [],
            archive: []
          };

          const writable = await indexHandle.createWritable();
          await writable.write(JSON.stringify(defaultContent, null, 2));
          await writable.close();
          await this.open_doc(id);
          // 3. Reload document list
          await this.indexFiles(dir);
        },

      async create_deck() {
          const entry = this.notebooks[this.notebook];
          if (!entry) return;

          const dir = entry.handle;
          await this.verifyPermissions(dir);

          // 1. Maak directory voor document
          const id = crypto.randomUUID();
          const docDir = await dir.getDirectoryHandle(id, { create: true });

          // 2. Maak index.json in die map
          const indexHandle = await docDir.getFileHandle("index.json", { create: true });

          const defaultContent = {
            id,
            name: "New narrative",
            status: "draft",
            created: Date.now(),
            updated: Date.now(),
            type: "infodeck",
            parent: "",
            sections: [],
            archive: []
          };

          const writable = await indexHandle.createWritable();
          await writable.write(JSON.stringify(defaultContent, null, 2));
          await writable.close();
          await this.open_doc(id);
          // 3. Reload document list
          await this.indexFiles(dir);
        },
      async prepare_deck(){
          let deck = [];
          for (const s of this.microDoc.json.sections.filter(x => x.type == 'slide')) {
            let slide = {};
            slide.title = s.title;
            slide.layout = s.layout;
            slide.sections = {};
            for (const key in s.sections) {
              let data = await this.fetch_section(s.sections[key].parent,s.sections[key].id);
              slide.sections[key] = data;
            }
            deck.push(slide);
          }
          localStorage.deck = JSON.stringify(deck);
          const w = window.open('/export-deck', '_blank');
      },

      async fetch_section(parent,id,data_only=false){
          const notebookEntry = this.notebooks[this.notebook];
          if (!notebookEntry) return;

          const notebookDir = notebookEntry.handle;
          await this.verifyPermissions(notebookDir);

          let docDir;
          try {
            docDir = await notebookDir.getDirectoryHandle(parent);
          } catch (err) {
            console.log(err);
            console.error("Documentmap niet gevonden:", parent);
            return;
          }
          const section = this.index.documents[parent].sections.find(s => s.id === id);
            try{
                const sectionHandle = await docDir.getFileHandle(section.id + "." + section.extension);
                const sectionFile = await sectionHandle.getFile();
                if (section.type == "image"){
                    section.data = URL.createObjectURL(sectionFile);
                } else if (section.extension == 'json'){
                    let text = await sectionFile.text();
                    section.data = JSON.parse(text);
                } else {
                    section.data = await sectionFile.text();
                }
            }catch{
                section.data = "";
            }
          if (data_only){
            return section.data;
          }
          return section;
      },
      async fetch_doc(id){
      // Haal notebook entry op
          const notebookEntry = this.notebooks[this.notebook];
          if (!notebookEntry) return;

          const notebookDir = notebookEntry.handle;
          await this.verifyPermissions(notebookDir);

          // 1. Documentmap ophalen
          let docDir;
          try {
            docDir = await notebookDir.getDirectoryHandle(id);
          } catch (err) {
            console.error("Documentmap niet gevonden:", id);
            return;
          }

          // 2. index.json ophalen binnen docDir
          let indexHandle;
          try {
            indexHandle = await docDir.getFileHandle("index.json");
          } catch (err) {
            console.error("index.json ontbreekt in document:", id);
            return;
          }

          // 3. Inhoud lezen
          const file = await indexHandle.getFile();
          const text = await file.text();

          let json;
          try {
            json = JSON.parse(text);
          } catch (err) {
            console.error("Ongeldige JSON in index.json:", err);
            json = {};
          }

          async function read_section(section){
            try{
                const sectionHandle = await docDir.getFileHandle(section.id + "." + section.extension);
                const sectionFile = await sectionHandle.getFile();
                if (section.type == "image"){
                    section.data = URL.createObjectURL(sectionFile);
                } else if (section.extension == 'json'){
                    let text = await sectionFile.text();
                    section.data = JSON.parse(text);
                } else {
                    section.data = await sectionFile.text();
                }
            }catch{
                section.data = "";
            }
          }
          for (const section of json.sections){
            await read_section(section)
          }

          for (const section of json.archive){
            await read_section(section)
          }
        return {json, docDir};
      },
      async open_doc(id) {
          if (!this.notebook) return;
          this.navigation = "doc";
          this.history = this.history.filter(x => x != id);
          this.history.unshift(id);
          this.save_enabled = false;
          localStorage.lastDocument = id;

          const {json, docDir} = await this.fetch_doc(id);

          if (json.type == "infodeck"){
            let slides = [];
            let sections = [];
            json.sections.forEach(s => {
                if (s.type == 'slide'){
                    slides.push(s);
                } else {
                    sections.push(s);
                }
            });
            json.sections = [...slides, ...sections];
          }
          // 4. Documentstate zetten
          let lineage = [];
          function add_children_to_lineage(node,index){
            lineage.push(node);
            if (node in index.lineage){
                index.lineage[node].forEach(node => add_children_to_lineage(node,index));
            }
          }
          add_children_to_lineage(id,this.index);
          this.microDoc = {
            id,
            lineage,
            dir: docDir,
            json,
          };
          setTimeout(function(){
            window.dispatchEvent(new CustomEvent("reload"));
          },500);
          setTimeout(this.enable_save.bind(this),1500);
          if (json.parent && !Object.keys(this.index.documents).includes(json.parent)){
            json.parent = "";
            setTimeout(this.save_doc.bind(this),1600);
          }
          await this.prepare_export();
        },

      async prepare_export(){
        try{
            let data = JSON.parse(JSON.stringify(this.microDoc.json));
            let sections = [];
            for (const section of data.sections){
                if (section.type == "reference"){
                    const {json, docDir} = await this.fetch_doc(section.document);
                    section.sections.forEach(s => {
                        sections.push(json.sections.filter(x => x.id == s).at(0));
                    });
                } else {
                    sections.push(section);
                }
            }
            data.sections = sections;
            localStorage.export = JSON.stringify(data,null,2);
        } catch(err){
            console.log(err);
        }
      },

      async delete_doc(id) {
          const notebookEntry = this.notebooks[this.notebook];
          if (!notebookEntry) return;
          if (!confirm("Delete from disk?")){return}
          // TODO: remove references e.g. parent ref
          const notebookDir = notebookEntry.handle;
          await this.verifyPermissions(notebookDir);

          let docDir;
          try {
            docDir = await notebookDir.getDirectoryHandle(id);
          } catch {
            console.error("Map bestaat niet:", id);
            return;
          }

          // 1. Alles in de map verwijderen
          for await (const [name, handle] of docDir.entries()) {
            await docDir.removeEntry(name, { recursive: true });
          }

          // 2. De map zelf verwijderen in de notebook map
          try {
            await notebookDir.removeEntry(id, { recursive: true });
          } catch (err) {
            console.error("Kon map niet verwijderen:", err);
            return;
          }

          // 3. UI opruimen
          if (this.microDoc?.json?.id === id) {
            this.microDoc = null;
          }

          // 4. Index opnieuw opbouwen
          await this.indexFiles(notebookDir);

          console.log(`Document "${id}" volledig verwijderd.`);
        },
      async delete_section(id) {
          const notebookEntry = this.notebooks[this.notebook];
          if (!notebookEntry) return;
          if (!confirm("Delete section from disk?")){return}
          this.microDoc.json.archive = this.microDoc.json.archive.filter(x => x.id != id);
          const notebookDir = notebookEntry.handle;
          await this.verifyPermissions(notebookDir);

          let docDir = this.microDoc.dir;
          for await (const [name, handle] of docDir.entries()) {
            if (name.startsWith(id + ".")){
                await docDir.removeEntry(name);
            }
          }
          await this.save_doc();
        },
      update_doc_type(){
          const allowed = [
            "id", "name", "status", "created", "updated",
            "type", "parent", "sections", "archive"
          ];

          const old = this.microDoc.json || {};

          // alleen de allowed keys meenemen
          const filtered = Object.fromEntries(
            Object.entries(old).filter(([k]) => allowed.includes(k))
          );

          // defaults opnieuw zetten
          filtered.status = "draft";

          // nieuwe object-assign zodat Alpine reageert
          if (filtered.type == 'design decision' || filtered.type == "ADR"){
            filtered.effect = {
                action: "",
            }
            if (filtered.type == 'design decision'){
                filtered.decision = "short summary of **problem** and **decision**";
            } else {
                filtered.ystatement = {
                  context: '',
                  concern: '',
                  decision: '',
                  alternatives: '',
                  quality: '',
                  consequence: ''
                }
            }
            const sections = filtered.sections.map(x => x.id);
            const archive = filtered.archive.map(x => x.id);
            if (!sections.includes("decision") && !archive.includes("decision")){
                filtered.sections.unshift({
                    type: "markdown",
                    extension: "md",
                    id: "decision",
                    data: "# Decision\n\nDescribe the decision that is taken..."
                });
            } else if (!sections.includes("decision")){
                filtered.sections.unshift(removeById(filtered.archive, "decision"));
            }
            if (!sections.includes("problem-statement") && !archive.includes("problem-statement")){
                filtered.sections.unshift({
                    type: "markdown",
                    extension: "md",
                    id: "problem-statement",
                    data: "# Problem statement\n\nDescribe the problem you are solving..."
                });
            } else if (!sections.includes("problem-statement")){
                filtered.sections.unshift(removeById(filtered.archive, "problem-statement"));
            }


          }
          else if (filtered.type == "principle"){
            filtered.scope = "landscape";
            filtered.principle = PRINCIPLE;
          } else if (filtered.type == 'persona'){
            filtered.effect = {
                    "action": "new persona",
                    "external": true,
                    "name": "<Persona>",
                    "description": "<description>"
                }
          }
          this.microDoc.json = filtered;
      },

      resize_textarea(){
        this.$nextTick(() => { this.$el.style.height='auto'; this.$el.style.height= (this.$el.scrollHeight +2 ) +'px' })
      },
      enable_save(){
        this.save_enabled = true;
      },

      debouncedSave() {
          clearTimeout(this.saveTimeout);

          this.saveTimeout = setTimeout(async () => {
            await this._save_doc_internal();
          }, this.debounceDelay);
        },

      async _save_doc_internal() {
          // Als we al aan het saven zijn → markeer dat er nog een save moet komen
          if (this.saving) {
            this.pendingSave = true;
            return;
          }

          this.saving = true;

          try {
            await this.save_doc(); // <- jouw bestaande functie
          } finally {
            this.saving = false;

            // Als er tijdens save nieuwe wijzigingen kwamen → nog een keer saven
            if (this.pendingSave) {
              this.pendingSave = false;
              await this._save_doc_internal();  // recursive flush
            }
          }
        },

      async save_doc() {
          if (!this.save_enabled){return}
          let microDoc = this.microDoc;
          if (!microDoc || !microDoc.dir) {
            console.error("save_doc: microDoc of directory ontbreekt");
            return;
          }

          const { dir, json, id } = microDoc;
          if (json.status == "deleted"){
            this.history = this.history.filter(x => x != id);
          }
          json.tags = [...new Set(json.tags)];
          try {
            // 1. Bestaat index.json? Anders aanmaken
            const indexHandle = await dir.getFileHandle("index.json", { create: true });

            // 2. Overschrijven
            const writable = await indexHandle.createWritable();
            json.updated = Date.now();
            let data = JSON.parse(JSON.stringify(json));

            async function save_section(section){
                if ("data" in section && section.data && section.type != "image"){
                    const sectionHandle = await dir.getFileHandle(section.id + "." + section.extension, { create: true });
                    const sectionWritable = await sectionHandle.createWritable();
                    if (section.extension == 'json'){
                        await sectionWritable.write(JSON.stringify(section.data,null,2));
                    } else {
                        await sectionWritable.write(section.data);
                    }
                    await sectionWritable.close();
                    delete section.data;
                }
            }

            for (const section of data.sections){
                await save_section(section);
            }

            if (!("archive" in data)){
                data.archive = [];
            }
            for (const section of data.archive){
                await save_section(section);
            }

            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            console.log(`Document ${id} opgeslagen.`);

            const entry = this.notebooks[this.notebook];
            const root_dir = entry.handle;
            await this.verifyPermissions(root_dir);
            await this.indexFiles(root_dir);
            await this.prepare_export();
          } catch (err) {
            console.error("Kon document niet opslaan:", err);
          }
        },

      //---------------------------------------------------------------------
      // REMOVE NOTEBOOK (soft delete)
      //---------------------------------------------------------------------
      async remove(id) {
        if (!id) return;

        delete this.notebooks[id];

        await new Promise((resolve, reject) => {
          const tx = idb.db.transaction("handles", "readwrite");
          tx.objectStore("handles").delete(id);
          tx.oncomplete = resolve;
          tx.onerror = reject;
        });

        if (localStorage.lastNotebook === id) {
          localStorage.removeItem("lastNotebook");
        }

        if (this.notebook === id) {
          this.notebook = "";
          this.files = [];
        }

        location.reload();
      },

      //---------------------------------------------------------------------
      // PERMISSION CHECK
      //---------------------------------------------------------------------
      async verifyPermissions(handle) {
        const opts = { mode: "readwrite" };

        if (typeof handle.queryPermission !== "function") {
          return true;
        }

        const perm = await handle.queryPermission(opts);
        if (perm === "granted") return true;

        try{
            const status = await handle.requestPermission(opts);
            if (status !== "granted") {
              this.permissionIssue = true;
              throw new Error("Permission not granted");
            }
            this.permissionIssue = false;
        } catch{
            this.permissionIssue = true;
        }


        return true;
      },

      get_referable_decisions(documents){
        let types = ["ADR","principle"];
        let status = ["decided","published"];
        return Object.values(documents).filter(x => types.includes(x.type)).filter(x => status.includes(x.status));
    }
    };
  });

});

function removeById(array, id) {
  const index = array.findIndex(x => x.id === id);
  if (index === -1) return null;
  return array.splice(index, 1)[0];
}

function sectionReorder(microDoc) {
    return {
        sections: microDoc.json.sections,

        moveUp(i) {
            if (i === 0) return;
            const arr = this.sections;
            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        },

        moveDown(i) {
            if (i === this.sections.length - 1) return;
            const arr = this.sections;
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        }
    };
}

function shortId(uuid) {
  if (uuid.startsWith("img-")){
    uuid = uuid.replace("img-","");
  }
  const hex = uuid.replace(/-/g, "").slice(0, 8);
  try{
    return parseInt(hex, 16).toString(36).toUpperCase();
  } catch {
    return hex;
  }
}

function copyShortId(text, event) {
    navigator.clipboard.writeText(text);

    const tooltip = event.currentTarget.querySelector('[x-ref="tooltip"]');
    tooltip.classList.add("opacity-100");

    setTimeout(() => {
        tooltip.classList.remove("opacity-100");
    }, 900);
}

function sortByPreferredOrder(results, preferredOrder) {
  if (!Array.isArray(results)) {
    results = Object.values(results);
  }
  const orderMap = new Map();

  // Map id → index in preferred order
  preferredOrder.forEach((id, i) => orderMap.set(id, i));

  return results.slice().sort((a, b) => {
    const aHas = orderMap.has(a.id);
    const bHas = orderMap.has(b.id);

    // 1. Als beide een voorkeurspositie hebben → sorteer daarnaar
    if (aHas && bHas) {
      return orderMap.get(a.id) - orderMap.get(b.id);
    }

    // 2. Als alleen A voorkeurspositie heeft → A eerst
    if (aHas && !bHas) return -1;

    // 3. Als alleen B voorkeurspositie heeft → B eerst
    if (!aHas && bHas) return 1;

    // 4. Als geen van beide in preferredOrder staat → fallback sortering
    return a.id.localeCompare(b.id);
  });
}

const PRINCIPLE = `### Statement
Describe **what** the principle enforces, in a clear, normative way.
Use active voice — e.g. *“To ensure X, we design Y as Z.”*
This line should stand on its own and express the core architectural stance.

> Example: To ensure domain clarity, each functional area is designed as an autonomous module with its own data model and lifecycle.

### Rationale
Explain **why** this principle exists — what value or trade-off it supports.
Optionally include examples to make the motivation tangible.
Keep it factual and reusable; others should be able to cite this principle as precedent.

> Example: Clear separation reduces coupling and prevents changes in one area from unexpectedly impacting another.
> It supports independent evolution, parallel development, and cleaner reasoning about behaviour.
> In practice, this helps teams avoid “god modules” and accidental shared state.

### Implication / Acceptance
Describe **what this principle implies** or **what we accept as a consequence**.
This section makes the trade-offs explicit, ensuring the principle isn’t interpreted as dogma.

> Example: We accept additional integration work between modules, such as explicit APIs or events.
> We also accept that cross-module operations may require coordination rather than shared access.`