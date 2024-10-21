class GitRepository {
  static worker = null;
  static url = null;
  static callbacks = {};

  // Open de repository en initialiseer de worker
  static async open(repoUrl) {
    if (!GitRepository.worker) {
      GitRepository.worker = new Worker('/js/webworkers/gitWorker.js');
      GitRepository.worker.onmessage = (event) => {
        GitRepository.callbacks[event.data.request_id](event);
        delete GitRepository.callbacks[event.data.request_id];
      };
    }
    let repo = new GitRepository(repoUrl);
    if (!GitRepository.url){
        await repo._sendMessage({
          action: 'initialize',
          repoUrl,
          pullInterval: 60000, // Standaard pull-interval
        });
        GitRepository.url = repoUrl;
    } else if (GitRepository.url != repoUrl){
        throw new Error(`The GIT worker is already initialized on repo [${GitRepository.url}] if you want to connect to [${repoUrl}] you have to execute the reset function first!`);
    }
    return repo;
  }

  static reset(){
    GitRepository.worker.terminate();
    GitRepository.worker = null;
    GitRepository.url = null;
    GitRepository.callbacks = {};
  }
  constructor(repoUrl) {
    this.repoUrl = repoUrl;
  }

  // Bestandslijst
  async list() {
    return this._sendMessage({ action: 'list' });
  }

  // Bestandsinhoud lezen
  async read(filePath) {
    return this._sendMessage({ action: 'read', filePath });
  }

  // Schrijven naar een bestand
  async write(filePath, content) {
    return this._sendMessage({
      action: 'write',
      filePath,
      content,
    });
  }

  // Bestand verwijderen
  async delete(filePath) {
    return this._sendMessage({
      action: 'delete',
      filePath,
    });
  }

  // Geef de status van gestagede wijzigingen
  async status() {
    return this._sendMessage({ action: 'status' });
  }

  // Revert de wijzigingen van een bestand
  async revert(filePath) {
    return this._sendMessage({
      action: 'revert',
      filePath,
    });
  }

  // Commit gestagede wijzigingen
  async commit(message) {
    return this._sendMessage({
      action: 'commit',
      message,
    });
  }

  // Push de wijzigingen naar de remote repository
  async push() {
    return this._sendMessage({ action: 'push' });
  }

  // Algemene methode om berichten naar de worker te sturen en resultaten te verwerken
  _sendMessage(message) {
    message.request_id = Draftsman.uuidv4();
    return new Promise((resolve, reject) => {
      GitRepository.callbacks[message.request_id] = function(event){
        if (event.data && event.data.result) {
          resolve(event.data.result);
        } else if (event.data.error) {
          reject(new Error(event.data.error));
        }
      };
      GitRepository.worker.postMessage(message);
    });
  }
}