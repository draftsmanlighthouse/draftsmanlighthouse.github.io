// --- Alle SVG templates (namen corresponderen met bestanden in /assets/) ---
const SVG_TEMPLATES = {
  database: 'database.svg',
  directory: 'directory.svg',
  bucket: 'bucket.svg',
  external_service: 'external-service.svg',
  internal_component: 'internal-component.svg',
  person_internal: 'person-internal.svg',
  person_external: 'person-external.svg',
  web_container: 'web-container.svg',
  message_channel: 'message-channel.svg',
  container: 'container.svg',
  component: 'component.svg'
};


// --- Helper: laad SVG-bestand, vervang placeholders, sanitize ---
async function loadAndPrepareSvg(name, replacements = {}) {
  const fileName = SVG_TEMPLATES[name];
  if (!fileName) throw new Error(`Onbekend SVG-type: ${name}`);

  const response = await fetch(`/assets/${fileName}`);
  if (!response.ok) throw new Error(`Kon SVG niet laden: ${fileName}`);

  let svg = await response.text();

  for (const [key, value] of Object.entries(replacements)) {
    svg = svg.replace(new RegExp(`%${key}%`, 'g'), value || '');
  }

  // maak er direct een data URI van
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

// --- Diagram engine (zonder PNG) ---
class C4Diagram {
  constructor(containerId) {
    this.containerId = containerId;
    this.elements = [];
    this.cy = null;
    this.idCounter = 0;
  }

  _generateId(prefix) {
    return `${prefix}_${this.idCounter++}`;
  }

  async _generateImage(type, replacements) {
    // geef direct een data:image/svg+xml terug
    return await loadAndPrepareSvg(type, replacements);
  }

  _addNode(data) {
    const node = { group: 'nodes', data };
    this.elements.push(node);
    return new C4Element(data.id, this);
  }

  async add_element(type, name, description = '', technology = '') {
    const id = this._generateId(type);
    const image = await this._generateImage(type, { name, description, technology });
    return this._addNode({ id, label: name, description, technology, type, image });
  }

  add_relation(source, target, label, direction = null) {
      const src = source instanceof C4Element ? source.id : source;
      const tgt = target instanceof C4Element ? target.id : target;
      this.elements.push({
        group: 'edges',
        data: { id: `edge_${src}_${tgt}`, source: src, target: tgt, label, direction }
      });
    }

  add_relation_if_not_exists(source, target, label, direction = null) {
      const src = source instanceof C4Element ? source.id : source;
      const tgt = target instanceof C4Element ? target.id : target;

      // Check if relation already exists
      const exists = this.elements.some(el =>
        el.group === "edges" &&
        el.data.source === src &&
        el.data.target === tgt
      );
      if (exists) {
        return; // Do nothing
      }

      // Otherwise add the relation
      this.elements.push({
        group: 'edges',
        data: { id: `edge_${src}_${tgt}`, source: src, target: tgt, label, direction }
      });
    }

  async render() {
    cytoscape.use(cytoscapeDagre);
    if (this.elements.length == 0){
        document.getElementById(this.containerId).innerHTML = `<h1 class="text-2xl">No visual elements on this level.</h1><h2 class="text-xl">But there may be principles and decisions</h2>`;
        return;
    }
    this.cy = cytoscape({
      container: document.getElementById(this.containerId),
      elements: this.elements.filter(x =>
        x.group == 'nodes'
        || (x.data.source && x.data.target )
      ),
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'rectangle',
            'background-image': 'data(image)',
            'background-fit': 'none',
            'background-clip': 'none',
            'background-opacity': 1,
            'width': '270px',
            'height': '200px',
            'padding': 0,
            'border-opacity': 0,
            'label': '' // tekst zit in SVG
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#555',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#555',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 11,
            'text-background-color': '#fff',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px'
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#3b82f6', // Tailwind blue-500
            'border-opacity': 1,
            'shadow-blur': 20,
            'shadow-color': '#3b82f6',
            'shadow-opacity': 0.5
          }
        },
        {
          selector: '$node > node',
          style: {
            'shape': 'roundrectangle',
            'background-color': 'transparent',
            'background-opacity': 0,
            'background-image': null,
            'border-width': 2,
            'border-opacity': 1,
            'padding': '25px',
            'label': 'data(label)',
            'font-size': 16,
            'font-weight': 'bold',
            'border-color': '#4A90E2',
            'color': '#4A90E2',
            'text-valign': 'bottom',       // label onderin
            'text-halign': 'center',         // label links
            'text-margin-y': '-18px',      // negatief = label omhoog in container
            'min-width': 150,
            'min-height': 100,
            'compound-sizing-wrt-labels': 'include',
            'z-compound-depth': 'bottom'
          }
        },
        {
          selector: 'node[?parent]', // child nodes
          style: {
            'compound-sizing-wrt-labels': 'exclude',
          }
        }
      ],
      layout: {
        name: 'dagre',
  rankDir: 'LR',
  nodeSep: 200,
  edgeSep: 50,
  rankSep: 100 }
    });
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;

      if (node.hasClass('highlighted')) {
        // tweede klik op dezelfde node → deselect
        node.removeClass('highlighted');
      } else {
        // andere klik → deselecteer alles en selecteer nieuwe
        this.cy.nodes().removeClass('highlighted');
        node.addClass('highlighted');
      }

      // Event uitsturen voor Alpine of andere listeners
      const detail = {
        id: node.id(),
        label: node.data('label'),
        type: node.data('type'),
        selected: node.hasClass('highlighted') // handig om mee te geven
      };
      window.dispatchEvent(new CustomEvent('c4-node-clicked', { detail }));
    });
    return this.cy;
  }
}

// --- Sub-element builder ---
class C4Element {
  constructor(id, diagram) {
    this.id = id;
    this.diagram = diagram;
  }

  async add_child(type, name, desc = '', tech = '') {
    const id = this.diagram._generateId(type);
    const image = await this.diagram._generateImage(type, {
      name,
      description: desc,
      technology: tech
    });
    return this.diagram._addNode({
      id,
      label: name,
      description: desc,
      technology: tech,
      type,
      parent: this.id,
      image
    });
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