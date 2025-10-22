// Initialiseer het diagram wanneer de pagina geladen is
async function initDiagram() {
  try {
    const diagram = new C4Diagram('cy');

    (async () => {
      const person = await diagram.add_element('person_internal', 'User', 'Internal user');
      const frontend = await diagram.add_element('web_container', 'Frontend', 'React UI', 'Next.js');
      const backend = await diagram.add_element('internal_component', 'API Server', 'Node.js');
      const db = await diagram.add_element('database', 'Orders DB', 'PostgreSQL');

      diagram.add_relation(person, frontend, 'uses', "LR");
      diagram.add_relation(frontend, backend, 'calls',"LR");
      diagram.add_relation(backend, db, 'reads/writes', "TB");

      await diagram.render();
    })();
  } catch (error) {
    console.error('Fout bij laden van diagram:', error);
  }
}

// Start het diagram
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDiagram);
} else {
  initDiagram();
}