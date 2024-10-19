class GitRepository {
  static worker = null;

  // Open de repository en initialiseer de worker
  static async open(repoUrl) {
    if (!GitRepository.worker) {
      GitRepository.worker = new Worker('/js/webworkers/gitWorker.js');
    }

    let repo = new GitRepository(repoUrl);
    await repo._sendMessage({
      action: 'initialize',
      repoUrl,
      pullInterval: 60000, // Standaard pull-interval
    });
    return repo;
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
    console.log(message);
    return new Promise((resolve, reject) => {
      GitRepository.worker.onmessage = (event) => {
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