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
                  for (const [key, value] of Object.entries(data.components)) {
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
                        if (!Object.hasOwn(parents, parent_name)) {
                          parents[parent_name] = await diagram.add_element('internal_component', parent_name);
                        }
                        let child = await parents[parent_name].add_child(value.type, value.name, value.description, value.technology)
                        components[parent_name + ":" + value.name] = child;
                    }
                  }
                  for (const edge of data.edges) {
                    if (edge.source in components && (edge.target in components || edge.target in stash)){
                        if (!(edge.target in components)){
                            let component = await diagram.add_element('external_service', edge.target, stash[edge.target].description, stash[edge.target].technology);
                            components[edge.target] = component;
                        }
                        diagram.add_relation(components[edge.source], components[edge.target], edge.label, "LR");
                    } else if (level == "enterprise" && edge.source.split(":").at(0) in components && edge.target.split(":").at(0) in components){
                        diagram.add_relation(components[edge.source.split(":").at(0)], components[edge.target.split(":").at(0)], edge.label, "LR");
                    }
                  }
//                  const person = await diagram.add_element('person_internal', 'User', 'Internal user');
//                  const frontend = await diagram.add_element('web_container', 'Frontend', 'React UI', 'Next.js');
//                  const backend = await diagram.add_element('internal_component', 'API Server', 'Node.js');
//                  const db = await diagram.add_element('database', 'Orders DB', 'PostgreSQL');
//
//                  diagram.add_relation(person, frontend, 'uses', "LR");
//                  diagram.add_relation(frontend, backend, 'calls',"LR");
//                  diagram.add_relation(backend, db, 'reads/writes', "TB");
                  console.log(diagram)
                  await diagram.render();
                })();
              } catch (error) {
                console.error('Fout bij laden van diagram:', error);
              }
        }
    }
  });
});
