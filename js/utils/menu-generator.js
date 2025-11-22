function buildMenuHTML(nodes) {

  if (nodes.filter(x => x.status != "deleted").length == 0){
    return "";
  }
  function renderNode(node) {
    if (node.status == "deleted"){
        return "";
    }
    const hasChildren = node.documents && node.documents.length > 0;

    if (!hasChildren) {
      // Leaf node
      return `
        <li>
          <a @click="open_doc('${node.id}')">${node.name}</a>
        </li>
      `;
    }

    // Node with children → use <details>
    return `
      <li>
        <details :open="openState['${node.id}'] ?? false"
         @toggle="openState['${node.id}'] = $el.open">
          <summary>${node.name}</summary>
          <ul>
            <li><a @click="open_doc('${node.id}')">document</a></li>
            ${node.documents.map(renderNode).join("")}
          </ul>
        </details>
      </li>
    `;
  }

  return `
    <ul class="menu bg-base-200 rounded-box m-5 w-[85%]">
      <div class="max-h-[50vh] overflow-auto">
      ${nodes.map(renderNode).join("")}
      </div>

    </ul>
  `;
}