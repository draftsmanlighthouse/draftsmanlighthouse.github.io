importScripts('https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js');

const queueDB = localforage.createInstance({ name: 'syncQueue' });

self.onmessage = async (event) => {
  const { type, change } = event.data;
  if (type === 'enqueue') {
    const id = crypto.randomUUID();
    await queueDB.setItem(id, { id, change, timestamp: Date.now(), status: 'pending' });
  }
};

// Eenvoudige retry-loop
async function processQueue() {
  const keys = await queueDB.keys();
  for (const key of keys) {
    const item = await queueDB.getItem(key);
    if (navigator.onLine) {
      try {
        //TODO sync
        console.log("Update:",item);
        await queueDB.removeItem(key); // klaar
      } catch (err) {
        console.warn('Sync failed, retry later', err);
      }
    }
  }
  setTimeout(processQueue, 1000); // elke 10s opnieuw
}

processQueue();
self.addEventListener('online', processQueue);