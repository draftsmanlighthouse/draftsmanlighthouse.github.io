// ============================================================================
//  FS POLYFILL (IndexedDB) - Met Binary Support voor Images
// ============================================================================

(function () {
  console.log("[FS Polyfill] Loaded");

  const DB_NAME = "fs-polyfill-v1";
  const STORE_NAME = "entries";

  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
            store.createIndex("by_root", "rootId", { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function makeKey(rootId, path) {
    return `${rootId}:${path}`;
  }

  async function putEntry(entry) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getEntry(rootId, path) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(makeKey(rootId, path));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function listChildren(rootId, dirPath) {
    const db = await openDb();
    const prefix = dirPath ? dirPath + "/" : "";

    return new Promise((resolve, reject) => {
      const result = [];
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index("by_root");
      const req = index.openCursor(IDBKeyRange.only(rootId));

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        const entry = cursor.value;

        if (!dirPath) {
          if (!entry.path.includes("/")) result.push(entry);
        } else if (entry.path.startsWith(prefix)) {
          const rest = entry.path.slice(prefix.length);
          if (!rest.includes("/")) result.push(entry);
        }

        cursor.continue();
      };

      req.onerror = () => reject(req.error);
    });
  }

  async function deleteEntryRecursive(rootId, targetPath) {
    const db = await openDb();
    const prefix = targetPath === "" ? "" : targetPath + "/";

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const index = tx.objectStore(STORE_NAME).index("by_root");
      const req = index.openCursor(IDBKeyRange.only(rootId));

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve();
          return;
        }
        const entry = cursor.value;

        if (
          entry.path === targetPath ||
          entry.path === "" && targetPath === "" ||
          entry.path.startsWith(prefix)
        ) {
          tx.objectStore(STORE_NAME).delete(entry.key);
        }

        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Helper functie om MIME type te detecteren op basis van extensie
  function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  class PolyfillFileHandle {
    constructor(rootId, path, name) {
      this.kind = "file";
      this.name = name;
      this._rootId = rootId;
      this._path = path;
    }

    async getFile() {
      const entry = await getEntry(this._rootId, this._path);

      if (!entry) {
        return new File([""], this.name, { type: "text/plain" });
      }

      // Ondersteuning voor binary data (Uint8Array) en text
      let content, type;

      if (entry.content instanceof Uint8Array) {
        // Binary data (bijv. images)
        content = entry.content;
        type = entry.mimeType || getMimeType(this.name);
      } else if (entry.content instanceof ArrayBuffer) {
        // ArrayBuffer → Uint8Array
        content = new Uint8Array(entry.content);
        type = entry.mimeType || getMimeType(this.name);
      } else {
        // Text content
        content = entry.content ?? "";
        type = entry.mimeType || "text/plain";
      }

      return new File([content], this.name, { type });
    }

    async createWritable() {
      const self = this;
      let buffer = null;
      let mimeType = getMimeType(this.name);

      return {
        async write(data) {
          if (data instanceof Blob) {
            // Binary data (images, PDFs, etc)
            mimeType = data.type || getMimeType(self.name);
            const arrayBuffer = await data.arrayBuffer();
            buffer = new Uint8Array(arrayBuffer);
          } else if (data instanceof ArrayBuffer) {
            buffer = new Uint8Array(data);
          } else if (data instanceof Uint8Array) {
            buffer = data;
          } else {
            // Text data
            buffer = String(data);
            mimeType = "text/plain";
          }
        },

        async close() {
          await putEntry({
            key: makeKey(self._rootId, self._path),
            rootId: self._rootId,
            path: self._path,
            kind: "file",
            name: self.name,
            content: buffer,
            mimeType: mimeType,
          });
        },
      };
    }
  }

  class PolyfillDirectoryHandle {
    constructor(rootId, path, name) {
      this.kind = "directory";
      this.name = name || "";
      this._rootId = rootId;
      this._path = path || "";
    }

    async *entries() {
      const items = await listChildren(this._rootId, this._path);
      for (const entry of items) {
        const p = entry.path;
        const n = entry.name;
        if (entry.kind === "directory") {
          yield [n, new PolyfillDirectoryHandle(this._rootId, p, n)];
        } else {
          yield [n, new PolyfillFileHandle(this._rootId, p, n)];
        }
      }
    }

    async *values() {
      for await (const [, handle] of this.entries()) {
        yield handle;
      }
    }

    async *keys() {
      for await (const [name] of this.entries()) {
        yield name;
      }
    }

    [Symbol.asyncIterator]() {
      return this.entries();
    }

    async getDirectoryHandle(name, opts = {}) {
      const p = this._path ? `${this._path}/${name}` : name;
      let entry = await getEntry(this._rootId, p);

      if (!entry) {
        if (!opts.create) throw new DOMException("NotFoundError");
        entry = {
          key: makeKey(this._rootId, p),
          rootId: this._rootId,
          path: p,
          kind: "directory",
          name,
        };
        await putEntry(entry);
      } else if (entry.kind !== "directory") {
        throw new TypeError("Not a directory");
      }

      return new PolyfillDirectoryHandle(this._rootId, p, name);
    }

    async getFileHandle(name, opts = {}) {
      const p = this._path ? `${this._path}/${name}` : name;
      let entry = await getEntry(this._rootId, p);

      if (!entry) {
        if (!opts.create) throw new DOMException("NotFoundError");
        entry = {
          key: makeKey(this._rootId, p),
          rootId: this._rootId,
          path: p,
          kind: "file",
          name,
          content: "",
          mimeType: getMimeType(name),
        };
        await putEntry(entry);
      } else if (entry.kind !== "file") {
        throw new TypeError("Not a file");
      }

      return new PolyfillFileHandle(this._rootId, p, name);
    }

    async removeEntry(name) {
      const p = this._path ? `${this._path}/${name}` : name;
      await deleteEntryRecursive(this._rootId, p);
    }

    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
  }

  async function polyfillShowDirectoryPicker() {
    const rootId = prompt("The filesystem API is blocked, browser storage (indexedDB) is used as an alternative.\nProvide a name for your notebook");
    if (!rootId){
        return;
    }

    await putEntry({
      key: makeKey(rootId, ""),
      rootId,
      path: "",
      kind: "directory",
      rootId,
    });

    return new PolyfillDirectoryHandle(rootId, "", rootId);
  }

  function repairDirectoryHandle(handle) {
    if (handle && handle.kind === 'directory') {
      if (typeof handle.entries !== 'function') {
        console.warn('[FS Repair] entries() not accessible, rebuilding...');
        if (handle._rootId && typeof handle._path === 'string') {
          return new PolyfillDirectoryHandle(
            handle._rootId,
            handle._path,
            handle.name
          );
        }
      }

      try {
        const iterator = handle.entries();
        if (!iterator || typeof iterator.next !== 'function') {
          throw new Error('Invalid iterator');
        }
      } catch (err) {
        console.warn('[FS Repair] entries() broken, rebuilding...', err);
        if (handle._rootId && typeof handle._path === 'string') {
          return new PolyfillDirectoryHandle(
            handle._rootId,
            handle._path,
            handle.name
          );
        }
      }
    }

    return handle;
  }

  window.polyfillShowDirectoryPicker = polyfillShowDirectoryPicker;
  window.repairDirectoryHandle = repairDirectoryHandle;

})();


// ============================================================================
//  WRAPPER: unified pickDirectory (native → fallback → polyfill)
// ============================================================================

(function () {
  async function tryNative() {
    if (!("showDirectoryPicker" in window)) throw new Error("Native FS missing");

    try {
      const h = await window.showDirectoryPicker({ mode: "readwrite" });

      if (h.queryPermission) {
        const p = await h.queryPermission({ mode: "readwrite" });
        if (p !== "granted") {
          const r = await h.requestPermission({ mode: "readwrite" });
          if (r !== "granted") throw new Error("Permission denied");
        }
      }

      return h;
    } catch (err) {
      console.warn("[FS Wrapper] Native failed:", err);
      throw err;
    }
  }

  window.pickDirectory = async function () {
    try {
      return await tryNative();
    } catch {
      console.log("[FS Wrapper] Fallback → polyfill");
      return await window.polyfillShowDirectoryPicker();
    }
  };
})();