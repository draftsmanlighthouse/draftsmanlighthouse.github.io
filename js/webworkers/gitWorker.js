importScripts('https://unpkg.com/isomorphic-git');
importScripts('https://cdn.jsdelivr.net/npm/@isomorphic-git/lightning-fs@4.6.0/dist/lightning-fs.min.js');
importScripts('https://unpkg.com/isomorphic-git/http/web/index.umd.js');

const isogit = self.git;
const root_http = self.GitHttp || self.http;
const http = deepCloneWithMethods(root_http);

// Pas custom headers toe
http["request"] = async function(options) {
  return root_http.request(options);
};

var fs = null;
var pfs = null;
let dir = '/';
let proxy = 'https://cors.isomorphic-git.org';

self.onmessage = async (event) => {
  const { action, repoUrl, filePath, content, message, request_id, pullInterval = 60000 } = event.data;

  try {
    switch (action) {
      case 'initialize':
        await initializeRepo(repoUrl, pullInterval);
        postMessage({ result: 'Repository initialized', request_id });
        break;

      case 'list':
        const fileList = await listFiles();
        postMessage({ result: fileList, request_id });
        break;

      case 'read':
        const fileContent = await readFile(filePath);
        postMessage({ result: fileContent, request_id });
        break;

      case 'write':
        await writeFile(filePath, content);
        postMessage({ result: `File ${filePath} written and staged`, request_id });
        break;

      case 'delete':
        await deleteFile(filePath);
        postMessage({ result: `File ${filePath} deleted and staged`, request_id });
        break;

      case 'status':
        const statusList = await status();
        postMessage({ result: statusList, request_id });
        break;

      case 'revert':
        await revertFile(filePath);
        postMessage({ result: `File ${filePath} reverted`, request_id });
        break;

      case 'commit':
        await commitChanges(message);
        postMessage({ result: `Changes committed: ${message}`, request_id });
        break;

      case 'push':
        await pushChanges();
        postMessage({ result: 'Changes pushed to remote', request_id });
        break;

      default:
        postMessage({ error: 'Unknown action', request_id });
    }
  } catch (error) {
    console.error(error);
    postMessage({ error: error.message, request_id });
  }
};

// Initialiseer de repository
async function initializeRepo(repoUrl, pullInterval, author = "j.doe") {
  if (!fs) {
    fs = new LightningFS(repoUrl.replace("https://github.com/", ""));
    pfs = fs.promises;
  } else {
    throw new Error("Git worker already attached to a repository!");
  }

  const dirExists = await pfs.readdir(dir).catch(() => false);

  if (dirExists.length === 0) {
    await cloneRepo(repoUrl, author);
  } else {
    await stageLocalChanges();
    await fetchRemoteChanges(repoUrl);
    await mergeRemoteChanges();
  }

  // Zet een interval voor het pullen van wijzigingen
  setInterval(async () => {
    await stageLocalChanges();
    await fetchRemoteChanges(repoUrl);
    await mergeRemoteChanges();
  }, pullInterval);
}

// Kloon de repository
async function cloneRepo(repoUrl, author) {
  await isogit.clone({
    fs,
    http,
    dir,
    url: repoUrl,
    corsProxy: proxy,
    singleBranch: true,
    depth: 1,
    ref: 'main'
  });

  await isogit.setConfig({
    fs,
    dir,
    path: 'user.name',
    value: author
  });
}

// Fetch remote changes
async function fetchRemoteChanges(repoUrl) {
  await isogit.fetch({
    fs,
    http,
    dir,
    corsProxy: proxy,
    url: repoUrl,
    ref: 'main',
    singleBranch: true
  });
}

// Merge remote changes without overwriting local changes
async function mergeRemoteChanges() {
  const mergeResult = await isogit.merge({
    fs,
    dir,
    ours: 'main',
    theirs: 'origin/main',
    fastForwardOnly: false
  });

  if (!mergeResult.fastForward && !mergeResult.clean) {
    console.log('Merge conflicts detected. Local changes preserved.');
  } else {
    console.log('Merge successful.');
  }
}

// Stage local changes
async function stageLocalChanges() {
  const status = await isogit.statusMatrix({ fs, dir });
  for (let [filepath, , workdirStatus, stageStatus] of status) {
    if (workdirStatus !== stageStatus) {
      await isogit.add({ fs, dir, filepath });
    }
  }
}

// Bestandsbeheer functies
async function listFiles() {
  return await pfs.readdir(dir);
}

async function readFile(filePath) {
  return await pfs.readFile(`${dir}/${filePath}`, 'utf8');
}

async function writeFile(filePath, content) {
  await pfs.writeFile(`${dir}/${filePath}`, content, 'utf8');
  await isogit.add({ fs, dir, filepath: filePath });
}

async function deleteFile(filePath) {
  await pfs.unlink(`${dir}/${filePath}`);
  await isogit.remove({ fs, dir, filepath: filePath });
}

async function status() {
  const statuses = await isogit.statusMatrix({ fs, dir });
  return statuses.map(([filepath, , workdirStatus, stageStatus]) => ({
    filePath: filepath,
    status:
      stageStatus === 1 && workdirStatus === 0 ? 'added' :
      stageStatus === 2 && workdirStatus === 2 ? 'changed' :
      stageStatus === 0 && workdirStatus === 0 ? 'removed' : 'unaltered'
  }));
}

async function revertFile(filePath) {
  console.log("Execute revert: ", filePath);

  // Reset het bestand alleen in de staging area
  await isogit.resetIndex({ fs, dir, filepath: filePath });

  // Vervolgens de wijzigingen in het bestand "unstagen" door het te verwijderen uit de staging area
  // Dit zorgt ervoor dat het bestand niet meer gestaged is maar de lokale wijzigingen blijven behouden
  await isogit.remove({ fs, dir, filepath: filePath });

  // Als je de lokale werkdirectory ook wilt resetten naar de versie in de HEAD-commit, gebruik dan `checkout`
  await isogit.checkout({
    fs,
    dir,
    filepaths: [filePath],
    force: true // Forceer geen overschrijven van lokale wijzigingen
  });

  console.log(`File ${filePath} reverted from staging area.`);
}

async function commitChanges(message) {
  await isogit.commit({
    fs,
    dir,
    author: { name: 'User', email: 'user@example.com' },
    message
  });
}

async function pushChanges() {
  await isogit.push({
    fs,
    http,
    dir,
    corsProxy: proxy
  });
}

// Deep clone met behoud van methodes
function deepCloneWithMethods(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) return obj.map(item => deepCloneWithMethods(item));

  if (obj instanceof Date) return new Date(obj.getTime());

  if (typeof obj === 'function') return obj;

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepCloneWithMethods(obj[key]);
    }
  }

  return clonedObj;
}
