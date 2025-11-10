$vui.config = {
    namespace: 'ui'
}
$vui.config.importMap = {
    "*": '/components/${path}${component}.html'
}

const worker = new Worker('/js/workers/background-sync.js');

function enqueueChange(change) {
  worker.postMessage({ type: 'enqueue', change });
}
