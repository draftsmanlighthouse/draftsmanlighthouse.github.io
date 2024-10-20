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

// Laad de .gql-bestandsinhoud als een string
async function loadGraphQLFile(filePath) {
  return new Promise((resolve, reject) => {
    fetch(filePath)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load GraphQL file: ${response.statusText}`);
        return response.text();
      })
      .then((text) => resolve(text))
      .catch((error) => reject(error));
  });
}

self.onmessage = async function (event) {
  const { action, queryFilePath, variables, endpoint, api_key, cache_ttl, ignore_cache, authenticated, websocket, token } = event.data;

  try {
    let queryString = "";
    switch (action) {
      case 'query':
      case 'mutation':
        // Haal het .gql-bestand op en gebruik de inhoud als query
        queryString = await loadGraphQLFile(queryFilePath);
        const cacheKey = JSON.stringify({ queryFilePath, variables });
        if (!ignore_cache) {
          const cachedResponse = await getCachedResponse(cacheKey);
          if (cachedResponse) {
            postMessage({ result: cachedResponse });
            return;
          }
        }

        const headers = authenticated
          ? { 'Authorization': `Bearer ${token}` }
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
        queryString = await loadGraphQLFile(queryFilePath);
        var header = {
            "host": websocket.replace("wss://","").replace("-realtime-","-").replace("/graphql",""),
            "x-api-key": api_key
        }
        console.log(header);
        let ws = `${websocket}?header=${btoa(JSON.stringify(header))}&payload=e30=`;
        let socket = new WebSocket(ws,"graphql-ws");
        socket.onopen = function(e) {
          socket.send(JSON.stringify({
            "id":uuidv4(),
            "payload":{
                "data": JSON.stringify({query:queryString,variables:variables}),
                "extensions":{
                    "authorization": header
                }
            },
            "type":"start"
          }));
        };
        socket.onmessage = function(event) {
            let data = JSON.parse(event.data).payload
            if (data){
                postMessage({ result: JSON.stringify(data) });
            }
        };
        socket.onclose = function(event) {
          if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
          } else {
//            subscription_reconnect_backoff += 1000;
//            console.log(`[close] Connection died, attempt to reconnect in ${subscription_reconnect_backoff/1000} seconds`);
//            setTimeout(function(){
//                Draftsman.subscribe(query,callback,variables);
//            },subscription_reconnect_backoff);
          }
        };
        socket.onerror = function(error) {
          console.log(`[error] ${error.message}`);
        };
        break;

      case 'clearCache':
        await clearCache();
        postMessage({ result: 'Cache cleared' });
        break;

      case 'invalidateCache':
        const invalidateKey = JSON.stringify({ queryFilePath, variables });
        await invalidateCache(invalidateKey);
        postMessage({ result: 'Cache entry invalidated' });
        break;

      default:
        postMessage({ error: 'Unknown action' });
    }
  } catch (error) {
    console.log(error);
    postMessage({ error: error.message });
  }
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}