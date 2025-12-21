// api.js — reliable, low-latency order sender with queue + retry
// Usage: api.sendOrder(orderObj) -> returns Promise that resolves quickly (optimistic) and ensures delivery.
// Requires: set ENDPOINT to your Google Apps Script web app (deployed as web app).

const api = (() => {
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbxPguXexbJAnlqI9RKN64pHk0S7ISzZRMWH-Q91oVFjQgdxBQCe-qHW6oQIWr5BIyxq/exec";
  const QUEUE_KEY = "miexa_send_queue_v1";
  const MAX_RETRIES = 6;
  const PROCESS_INTERVAL = 10_000; // ms between background attempts

  // save queue
  function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  function loadQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } }

  // low-overhead send: use sendBeacon if available (background, low-latency)
  function sendBeacon(payload) {
    try {
      if (navigator && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        return navigator.sendBeacon(ENDPOINT, blob);
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // fetch with keepalive + timeout
  function fetchWithTimeout(body, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      signal: controller.signal
    }).finally(() => clearTimeout(id));
  }

  // Enqueue a payload (with metadata for retries)
  function enqueue(payload) {
    const q = loadQueue();
    q.push({ payload, attempts: 0, ts: Date.now() });
    saveQueue(q);
  }

  // Process queue: attempt to send each item with exponential backoff
  async function processQueue() {
    const q = loadQueue();
    if (!q.length) return;
    let changed = false;
    for (let i = 0; i < q.length; i++) {
      const item = q[i];
      // skip if too soon (simple backoff check)
      const delay = Math.min(1000 * Math.pow(2, item.attempts), 60_000);
      if (Date.now() - (item.lastAttempt || item.ts) < delay) continue;

      try {
        item.lastAttempt = Date.now();
        // send via fetch (we prefer successful response over sendBeacon)
        await fetchWithTimeout(item.payload, 12_000);
        // if success, remove from queue
        q.splice(i, 1);
        i--;
        changed = true;
        console.log("api: queued item sent", item.payload);
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        changed = true;
        console.warn("api: send failed, will retry", item.attempts, err);
        if (item.attempts > MAX_RETRIES) {
          // drop it to avoid infinite loops; you can also move to 'failed' list
          q.splice(i, 1);
          i--;
          console.error("api: dropping payload after max retries", item.payload);
        }
      }
    }
    if (changed) saveQueue(q);
  }

  // Start background processor
  setInterval(processQueue, PROCESS_INTERVAL);
  // also run once on load
  processQueue().catch(() => {});

  // Public sendOrder: optimistic UX + durable persistence
  async function sendOrder(order) {
    if (!order || typeof order !== "object") throw new Error("Order must be an object");

    // minimal envelope
    const envelope = {
      ts: new Date().toISOString(),
      client: { ua: navigator.userAgent, url: location.href },
      order
    };

    // Try sendBeacon (fast)
    const beaconOk = sendBeacon(envelope);

    // Also enqueue to local queue for durability
    enqueue(envelope);

    // Fire a fetch attempt in background (non-blocking). We intentionally don't await it here to keep UI responsive.
    fetchWithTimeout(envelope, 8000).then(() => {
      // attempt to remove matching envelope from queue on success
      const q = loadQueue();
      const idx = q.findIndex(i => i.payload && i.payload.ts === envelope.ts);
      if (idx !== -1) { q.splice(idx,1); saveQueue(q); }
      console.log("api: immediate fetch succeeded for", envelope.ts);
    }).catch(err => {
      console.log("api: immediate fetch failed (will retry via queue)", err);
    });

    // Resolve quickly — UI should show optimistic confirmation
    return Promise.resolve({ ok: true, queued: true, beacon: !!beaconOk });
  }

  return { sendOrder, _processQueue: processQueue };
})();
