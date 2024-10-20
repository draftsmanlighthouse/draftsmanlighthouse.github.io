const CACHE_DB_NAME = 'graphql-cache';
const CACHE_STORE_NAME = 'graphql-queries';
let cacheDB = null;

// Open IndexedDB voor caching
async function openCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      cacheDB = event.target.result;
      resolve(cacheDB);
    };

    request.onerror = (event) => {
      reject(`Failed to open IndexedDB: ${event.target.errorCode}`);
    };
  });
}

// Sla een query of mutation response op in IndexedDB
async function cacheResponse(id, response, ttl) {
  await openCache();
  const expiry = Date.now() + ttl * 1000; // TTL in seconden
  const transaction = cacheDB.transaction([CACHE_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(CACHE_STORE_NAME);
  store.put({ id, response, expiry });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(`Failed to cache response: ${event.target.errorCode}`);
  });
}

// Haal een cached response op uit IndexedDB
async function getCachedResponse(id) {
  await openCache();
  const transaction = cacheDB.transaction([CACHE_STORE_NAME], 'readonly');
  const store = transaction.objectStore(CACHE_STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const entry = event.target.result;
      if (entry && entry.expiry > Date.now()) {
        resolve(entry.response); // Cache geldig
      } else {
        resolve(null); // Cache verlopen of niet gevonden
      }
    };

    request.onerror = (event) => {
      reject(`Failed to retrieve cached response: ${event.target.errorCode}`);
    };
  });
}

// Verwijder specifieke cache entry
async function invalidateCache(id) {
  await openCache();
  const transaction = cacheDB.transaction([CACHE_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(CACHE_STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(`Failed to delete cache: ${event.target.errorCode}`);
  });
}

// Leeg de cache
async function clearCache() {
  await openCache();
  const transaction = cacheDB.transaction([CACHE_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(CACHE_STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(`Failed to clear cache: ${event.target.errorCode}`);
  });
}

self.onmessage = async function (event) {
  const { action, queryString, variables, endpoint, api_key, cache_ttl, ignore_cache, authenticated, websocket } = event.data;

  try {
    switch (action) {
      case 'query':
      case 'mutation':
        const cacheKey = JSON.stringify({ queryString, variables });
        if (!ignore_cache) {
          const cachedResponse = await getCachedResponse(cacheKey);
          if (cachedResponse) {
            postMessage({ result: cachedResponse });
            return;
          }
        }

        const headers = authenticated
          ? { 'Authorization': `Bearer ${sessionStorage.token}` }
          : { 'x-api-key': api_key };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ query: queryString, variables }),
        });
        const result = await response.json();

        if (!ignore_cache && cache_ttl) {
          await cacheResponse(cacheKey, result, cache_ttl);
        }

        postMessage({ result });
        break;

      case 'subscription':
        const ws = new WebSocket(websocket);
        ws.onopen = () => {
          ws.send(JSON.stringify({ query: queryString, variables }));
        };
        ws.onmessage = (message) => {
          postMessage({ result: JSON.parse(message.data) });
        };
        break;

      case 'clearCache':
        await clearCache();
        postMessage({ result: 'Cache cleared' });
        break;

      case 'invalidateCache':
        const invalidateKey = JSON.stringify({ queryString, variables });
        await invalidateCache(invalidateKey);
        postMessage({ result: 'Cache entry invalidated' });
        break;

      default:
        postMessage({ error: 'Unknown action' });
    }
  } catch (error) {
    postMessage({ error: error.message });
  }
};
