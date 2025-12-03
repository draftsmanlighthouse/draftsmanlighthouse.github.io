
const storage = {
    mode: "fs",

    async import(){
        if (this.mode == "fs"){
            const handle = await window.showDirectoryPicker({
                mode: "readwrite"
              });
            await this.verifyPermissions(handle);

            const id = "notebook-" + crypto.randomUUID();
            const entry = { id, name: handle.name, handle };

            await idb.save(id, entry);
            localStorage.lastNotebook = id;
            return entry;
        }
    },

    async checkPermission(entry){
        if (this.mode == "fs"){
            const dir = entry.handle;
            await this.verifyPermissions(dir);
        }
    },

    async get_all(entry){
        if (this.mode == "fs"){
            return await entry.handle.entries();
        }
    },

    async verifyPermissions(handle) {
        const opts = { mode: "readwrite" };

        if (typeof handle.queryPermission !== "function") {
          return true;
        }

        const perm = await handle.queryPermission(opts);
        if (perm === "granted") return true;

        try{
            const status = await handle.requestPermission(opts);
            if (status !== "granted") {
              sessionStorage.permissionIssue = true;
              throw new Error("Permission not granted");
            }
            sessionStorage.permissionIssue = false;
        } catch{
            sessionStorage.permissionIssue = true;
        }


        return true;
      }
}