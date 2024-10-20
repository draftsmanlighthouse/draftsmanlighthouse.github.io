importScripts('https://unpkg.com/isomorphic-git');
importScripts('https://cdn.jsdelivr.net/npm/@isomorphic-git/lightning-fs@4.6.0/dist/lightning-fs.min.js');
importScripts('https://unpkg.com/isomorphic-git/http/web/index.umd.js');

const isogit = self.git;
const http = self.GitHttp || self.http;

var fs = null;
var pfs = null;

let dir = '/';
let proxy = null;

self.onmessage = async (event) => {
  const { action, repoUrl, filePath, content, message } = event.data;

  try {
    switch (action) {
      case 'initialize':
        await initializeRepo(repoUrl, event.data.pullInterval);
        postMessage({ result: 'Repository initialized' });
        break;

      case 'list':
        const fileList = await listFiles();
        postMessage({ result: fileList });
        break;

      case 'read':
        const fileContent = await readFile(filePath);
        postMessage({ result: fileContent });
        break;

      case 'write':
        await writeFile(filePath, content);
        postMessage({ result: `File ${filePath} written and staged` });
        break;

      case 'delete':
        await deleteFile(filePath);
        postMessage({ result: `File ${filePath} deleted and staged` });
        break;

      case 'status':
        const statusList = await status();
        postMessage({ result: statusList });
        break;

      case 'revert':
        await revertFile(filePath);
        postMessage({ result: `File ${filePath} reverted` });
        break;

      case 'commit':
        await commitChanges(message);
        postMessage({ result: `Changes committed: ${message}` });
        break;

      case 'push':
        await pushChanges();
        postMessage({ result: 'Changes pushed to remote' });
        break;

      default:
        postMessage({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error(error);
    postMessage({ error: error.message });
  }
};

// Initialiseer de repository
async function initializeRepo(repoUrl, pullInterval,author="j.doe"){
  proxy = 'https://cors.isomorphic-git.org'; // Proxy voor CORS-ondersteuning
  if (!fs){
    fs = new LightningFS(repoUrl.replace("https://github.com/",""));
    pfs = fs.promises;
  } else {
    throw new Error("Git worker already attached to a repository!");
  }
  const dirExists = await pfs.readdir(dir).catch(() => false);

  if (dirExists.length == 0) {
    // Als de repo nog niet bestaat, kloon deze
    await isogit.clone({
      fs,
      http,
      dir,
      url: repoUrl,
      corsProxy: proxy,
      singleBranch: true,  // Zorg ervoor dat alleen de specifieke branch wordt gedownload
      depth: 1,            // Shallow clone, alleen de laatste commit
      ref: 'main'          // De branch die je wilt klonen, bijvoorbeeld 'main'
    });
    await isogit.setConfig({
            fs,
            dir: dir,
            path: 'user.name',
            value: author
      });
  } else {
    // Anders, pull de laatste wijzigingen
    await isogit.pull({ fs,http, dir, url: repoUrl, corsProxy: proxy, ref: 'main' });
  }

  // Zet een interval voor het pullen van wijzigingen
  setInterval(async () => {
    await isogit.pull({ fs, http, dir, url: repoUrl, corsProxy: proxy, ref: 'main' });
  }, pullInterval);
}

// Geef een lijst van bestanden
async function listFiles() {
  const files = await pfs.readdir(dir);
  return files;
}

// Lees de inhoud van een bestand
async function readFile(filePath) {
  const content = await pfs.readFile(`${dir}/${filePath}`, 'utf8');
  return content;
}

// Schrijf naar een bestand en stage de wijziging
async function writeFile(filePath, content) {
  await pfs.writeFile(`${dir}/${filePath}`, content, 'utf8');
  await isogit.add({ fs, dir, filepath: filePath });
}

// Verwijder een bestand en stage de wijziging
async function deleteFile(filePath) {
  await pfs.unlink(`${dir}/${filePath}`);
  await isogit.remove({ fs, dir, filepath: filePath });
}

// Geef de status van gestagede wijzigingen
async function status() {
  const statuses = await isogit.statusMatrix({ fs, dir });
  return statuses.map(([filepath, , workdirStatus, stageStatus]) => ({
    filePath: filepath,
    status:
      stageStatus === 1 && workdirStatus === 0
        ? 'added'
        : stageStatus === 2 && workdirStatus === 2
        ? 'changed'
        : stageStatus === 0 && workdirStatus === 0
        ? 'removed'
        : 'unknown',
  }));
}

// Revert een bestand
async function revertFile(filePath) {
  await isogit.resetIndex({ fs, dir, filepath: filePath });
}

// Commit de gestagede wijzigingen
async function commitChanges(message) {
  await isogit.commit({
    fs,
    dir,
    author: { name: 'User', email: 'user@example.com' },
    message,
  });
}

// Push de wijzigingen naar de remote repository
async function pushChanges() {
  await isogit.push({ fs, http, dir, corsProxy: proxy });
}