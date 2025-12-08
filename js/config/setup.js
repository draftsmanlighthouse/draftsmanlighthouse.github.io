$vui.config = {
    namespace: 'ui'
}
$vui.config.importMap = {
    "*": '/components/${path}${component}.html'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}