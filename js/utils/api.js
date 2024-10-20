class API {
  static worker = null;
  static cache_enabled = true;

  static async initialize(authenticated=false,cache_ttl = "60M") {
    if (!API.worker) {
      API.worker = new Worker('/js/webworkers/apiWorker.js'); // Path to your worker script
    }
    let api = new API(api_url, api_ws, api_key, API.cache_enabled, cache_ttl);
    if (authenticated){
        api.checkAuthentication();
    }
    return api;
  }

  constructor(endpoint, websocket, api_key, cache_enabled, cache_ttl) {
    this.endpoint = endpoint;
    this.websocket = websocket;
    this.api_key = api_key;
    this.cache_enabled = cache_enabled;
    this.cache_ttl = this.convertTTLtoSeconds(cache_ttl);
  }

  /**
   * Helper method to convert time-to-live (TTL) format (like '60M', '1H') to seconds.
   */
  convertTTLtoSeconds(ttl) {
    const ttlValue = parseInt(ttl);
    if (ttl.endsWith('M')) return ttlValue * 60;  // Convert minutes to seconds
    if (ttl.endsWith('H')) return ttlValue * 3600;  // Convert hours to seconds
    return ttlValue;
  }

  /**
   * Redirect to /auth if the token is missing in sessionStorage.
   */
  checkAuthentication() {
    const token = sessionStorage.getItem('token');
    if (!token || parseInt(sessionStorage.getItem('token_expiration')) < Date.now()) {;
      window.location.href = 'auth'; // Redirect to /auth if no token is found
      return false; // Return false to stop further execution
    }
    return true; // Token is present
  }

  /**
   * Perform a GraphQL query.
   */
  async query(queryString, variables = {}, authenticated = false, callback = console.log, ignore_cache = false) {
    if (authenticated && !this.checkAuthentication()) return;

    this._sendMessage({
      action: 'query',
      queryString,
      variables,
      endpoint: this.endpoint,
      api_key: this.api_key,
      cache_ttl: this.cache_enabled ? this.cache_ttl : 0,
      ignore_cache,
      authenticated,
    }, callback);
  }

  /**
   * Perform a GraphQL mutation.
   */
  async mutation(queryString, variables = {}, authenticated = false, callback = console.log, ignore_cache = false) {
    if (authenticated && !this.checkAuthentication()) return;

    this._sendMessage({
      action: 'mutation',
      queryString,
      variables,
      endpoint: this.endpoint,
      api_key: this.api_key,
      cache_ttl: this.cache_enabled ? this.cache_ttl : 0,
      ignore_cache,
      authenticated,
    }, callback);
  }

  /**
   * Perform a GraphQL subscription using WebSockets.
   */
  async subscription(queryString, variables = {}, authenticated = false, callback = console.log) {
    if (authenticated && !this.checkAuthentication()) return;

    this._sendMessage({
      action: 'subscription',
      queryString,
      variables,
      websocket: this.websocket,
      api_key: this.api_key,
      authenticated,
    }, callback);
  }

  /**
   * Clear the entire cache.
   */
  async clear_cache() {
    this._sendMessage({ action: 'clearCache' }, () => {});
  }

  /**
   * Invalidate a specific cache entry.
   */
  async invalidate_cache_entry(queryString, variables = {}) {
    this._sendMessage({
      action: 'invalidateCache',
      queryString,
      variables,
    }, () => {});
  }

  /**
   * Send a message to the worker and handle the response.
   */
  _sendMessage(message, callback) {
    return new Promise((resolve, reject) => {
      API.worker.onmessage = (event) => {
        if (event.data && event.data.result) {
          callback(event.data.result);
          resolve(event.data.result);
        } else if (event.data.error) {
          reject(new Error(event.data.error));
        }
      };
      API.worker.postMessage(message);
    });
  }
}
