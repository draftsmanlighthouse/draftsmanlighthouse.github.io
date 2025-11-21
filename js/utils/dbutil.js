const idb = {
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("architecture-notebooks", 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        db.createObjectStore("handles", { keyPath: "id" });
      };
      req.onsuccess = e => {
        this.db = e.target.result;
        resolve();
      };
      req.onerror = err => reject(err);
    });
  },

  async save(id, entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("handles", "readwrite");
      tx.objectStore("handles").put(entry);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  },

  async get(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
  },

  async getAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
  }
};