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
  message_channel: 'message-channel.svg'
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

  async render() {
    this.cy = cytoscape({
      container: document.getElementById(this.containerId),
      elements: this.elements,
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
        }
      ],
      layout: { name: 'cose', padding: 60 }
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