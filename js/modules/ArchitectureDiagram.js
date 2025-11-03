document.addEventListener('alpine:init', () => {
  Alpine.data('C4Diagram', function(){
    return {
        async draw(level,data){
            try {
                const diagram = new C4Diagram('c4');
                let parents = {};
                let components = {};
                (async () => {
                  // loop data key:value en in die loop wil ik if statements om de elementen toe te voegen.
                  // dat toevoegen doe ik zelf wel, maar wat is de juiste manier om die loop te maken
                  // en met async funcs om te gaan?
                  // TODO: Er voor zorgen dat systeem/component namen geen : bevatten. Want dat heeft betekenis in ons model.
                  let stash = {};
                  let history = {};
                  console.log(data)
                  for (const [key, value] of Object.entries(data.components)) {
                    history[key] = value;
                    if (level == "enterprise" && !key.includes(":") && value.scope == "internal"){
                        let component = await diagram.add_element('internal_component', key, value.description, value.technology);
                        components[key] = component;
                    }
                    if (level == "enterprise" && !key.includes(":") && value.scope == "external"){
                        let component = await diagram.add_element('external_service', key, value.description, value.technology);
                        components[key] = component;
                    }
                    if (value.scope == "external"){
                        stash[key] = value;
                    }
                    if (level.split(':').length === 2) {
                        let parent_name = level.split(':').at(1);
                        if (!key.startsWith(parent_name + ":")){
                            continue;
                        }
                        if (key.split(":").length == 3){
                            continue;
                        }
                        if (!Object.hasOwn(parents, parent_name)) {
                          parents[parent_name] = await diagram.add_element('internal_component', parent_name);
                        }
                        let el_type = value.type == 'internal_component' ? 'container' : value.type;
                        let child = await parents[parent_name].add_child(el_type, value.name, value.description, value.technology)
                        components[parent_name + ":" + value.name] = child;
                    }
                    if (level.split(':').length === 3) {
                        let grandparent_name = level.split(':').at(1);
                        let parent_name = level.split(':').slice(1).join(":");
                        if (!key.startsWith(parent_name + ":")){
                            continue;
                        }
                        if (!Object.hasOwn(parents, grandparent_name)) {
                          parents[grandparent_name] = await diagram.add_element('internal_component', grandparent_name);
                        }
                        if (!Object.hasOwn(parents, parent_name)) {
                            parents[parent_name] = await parents[grandparent_name].add_child('internal_component', parent_name.split(":")[1]);
                        }
                        let child = await parents[parent_name].add_child('component', value.name, value.description, value.technology)
                        components[parent_name + ":" + value.name] = child;
                    }
                  }
                  let edges = data.edges.filter(x => x?.source && x?.target && !x.source.startsWith("persona:") && !x.target.startsWith("persona:")).filter(x => x.source in components || x.target in components);
                  for (const edge of edges) {
                    if (edge.source in components && edge.target in components){
                        diagram.add_relation(components[edge.source], components[edge.target], edge.label, "LR");
                    } else if (level == "enterprise" && edge.source.split(":").at(0) in components && edge.target.split(":").at(0) in components){
                        diagram.add_relation(components[edge.source.split(":").at(0)], components[edge.target.split(":").at(0)], edge.label, "LR");
                    } else {
                        if (!(edge.target in components)){
                            let grandparent = edge.target.split(":")[0]
                            let parent = edge.target.split(":").slice(0,2).join(":");
                            if (parent in components){
                                diagram.add_relation(components[edge.source], components[parent], edge.label, "LR");
                            } else if (grandparent in components || grandparent in parents){
                                let target = grandparent in components ? components[grandparent] : parents[grandparent]
                                let el_type = 'type' in history[parent] ? history[parent].type : history[parent].scope == 'external' ? 'external_service' : 'internal_component';
                                components[parent] = await target.add_child(el_type,history[parent].name,history[parent].description,history[parent].technology);
                                diagram.add_relation(components[edge.source], components[parent], edge.label, "LR");
                            } else {
                                let el_type = 'type' in history[parent] ? history[parent].type : history[parent].scope == 'external' ? 'external_service' : 'internal_component';
                                components[grandparent] = await diagram.add_element(el_type,grandparent,history[grandparent].description,history[grandparent].technology);
                                diagram.add_relation(components[edge.source], components[grandparent], edge.label, "LR");
                            }
                        } else {
                            let grandparent = edge.source.split(":")[0]
                            let parent = edge.source.split(":").slice(0,2).join(":");
                            if (edge.source == 'Tracepaper:Build Agent:ZIP-based API'){
                                console.log(grandparent)
                                console.log(parent);
                                console.log()
                            }
                            if (parent in components){
                                diagram.add_relation(components[parent], components[edge.target], edge.label, "LR");
                            } else if (grandparent in components || grandparent in parents){
                                let target = grandparent in components ? components[grandparent] : parents[grandparent]
                                let el_type = 'type' in history[parent] ? history[parent].type : history[parent].scope == 'external' ? 'external_service' : 'internal_component';
                                components[parent] = await target.add_child(el_type,history[parent].name,history[parent].description,history[parent].technology);
                                diagram.add_relation(components[parent], components[edge.target], edge.label, "LR");
                            } else {
                                let el_type = 'type' in history[parent] ? history[parent].type : history[parent].scope == 'external' ? 'external_service' : 'internal_component';
                                components[grandparent] = await diagram.add_element(el_type,grandparent,history[grandparent].description,history[grandparent].technology);
                                diagram.add_relation(components[grandparent], components[edge.target], edge.label, "LR");
                            }
                        }
                    }

                  }

                  edges = data.edges.filter(x => x?.source && x.source.startsWith("persona:"))
                  for (const edge of edges) {
                    let target = edge.target;
                    let grandparent = edge.target.split(":")[0]
                    let parent = edge.target.split(":").slice(0,2).join(":");
                    if (!(target in components)){
                        target = parent;
                    }
                    if (!(target in components)){
                        target = grandparent;
                    }
                    if (!(target in components)){
                        continue;
                    }
                    let el = history[edge.source];
                    let visual = el.external ? "person_external" : "person_internal";
                    components[edge.source] = await diagram.add_element(visual,el.name,el.description);
                    diagram.add_relation(components[edge.source], components[target], edge.label, "LR");
                  }
                  await diagram.render();
                })();
              } catch (error) {
                console.error('Fout bij laden van diagram:', error);
              }
        }
    }
  });
});
