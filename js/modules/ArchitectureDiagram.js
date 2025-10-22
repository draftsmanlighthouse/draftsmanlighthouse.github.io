document.addEventListener('alpine:init', () => {
  Alpine.data('C4Diagram', function(){
    return {
        async draw(level,data){
            try {
                const diagram = new C4Diagram('c4');
                (async () => {
                  // loop data key:value en in die loop wil ik if statements om de elementen toe te voegen.
                  // dat toevoegen doe ik zelf wel, maar wat is de juiste manier om die loop te maken
                  // en met async funcs om te gaan?
                  // TODO: Er voor zorgen dat systeem/component namen geen : bevatten. Want dat heeft betekenis in ons model.
                  for (const [key, value] of Object.entries(data)) {
                    console.log(value);
                    if (level == "enterprise" && !key.includes(":") && value.scope == "internal"){
                        let component = await diagram.add_element('internal_component', key, value.description, value.technology);
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

                  await diagram.render();
                })();
              } catch (error) {
                console.error('Fout bij laden van diagram:', error);
              }
        }
    }
  });
});
