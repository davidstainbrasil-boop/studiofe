/**
 * 🔧 Enhanced Service Worker - TécnicoCursos PWA
 * 
 * Features:
 * - Strategic caching with versioning
 * - Network-first for API, Cache-first for assets
 * - Offline page support
 * - Background sync for pending operations
 * - Push notifications
 * - Periodic cleanup
 */

// ============================================
// Configuration
// ============================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const MEDIA_CACHE = `media-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// Routes that should always go network-first
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/',
  '/_next/webpack-hmr'
];

// Routes that can be served from cache first
const CACHE_FIRST_ROUTES = [
  '/static/',
  '/_next/static/',
  '/images/',
  '/fonts/',
  '/videos/',
  '/audio/'
];

// API routes that can be cached with stale-while-revalidate
const STALE_WHILE_REVALIDATE_ROUTES = [
  '/api/templates',
  '/api/courses',
  '/api/analytics',
  '/api/user/preferences'
];

// Max age for different cache types (in seconds)
const CACHE_MAX_AGE = {
  api: 5 * 60,           // 5 minutes
  static: 7 * 24 * 60 * 60, // 7 days
  media: 30 * 24 * 60 * 60  // 30 days
};

// Max items per cache
const CACHE_MAX_ITEMS = {
  dynamic: 50,
  api: 30,
  media: 20
};

// ============================================
// Install Event
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(err => {
          console.warn('[SW] Some assets failed to precache:', err);
          // Continue even if some assets fail
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// Activate Event
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('static-') ||
                     name.startsWith('dynamic-') ||
                     name.startsWith('api-') ||
                     name.startsWith('media-');
            })
            .filter((name) => {
              return name !== STATIC_CACHE &&
                     name !== DYNAMIC_CACHE &&
                     name !== API_CACHE &&
                     name !== MEDIA_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// ============================================
// Fetch Event - Main Routing
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests (except for specific allowed origins)
  if (url.origin !== self.location.origin) {
    // Allow specific external resources (fonts, CDN, etc)
    if (shouldCacheExternalResource(url)) {
      event.respondWith(networkFirstStrategy(request, MEDIA_CACHE));
    }
    return;
  }

  // Route to appropriate strategy
  if (isNetworkFirstRoute(url.pathname)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isCacheFirstRoute(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isStaleWhileRevalidateRoute(url.pathname)) {
    event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE));
  } else if (isMediaRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, MEDIA_CACHE));
  } else if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
  } else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  }
});

// ============================================
// Caching Strategies
// ============================================

/**
 * Network First - Try network, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      await trimCache(cacheName, CACHE_MAX_ITEMS.dynamic);
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // For API requests, return error response
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Network unavailable', offline: true }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

/**
 * Cache First - Try cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    // Check if cache is still valid
    const cacheDate = cached.headers.get('sw-cache-date');
    if (cacheDate) {
      const maxAge = getMaxAgeForCache(cacheName);
      const age = (Date.now() - parseInt(cacheDate, 10)) / 1000;
      
      if (age > maxAge) {
        // Cache expired, fetch new
        return fetchAndCache(request, cacheName);
      }
    }
    return cached;
  }
  
  return fetchAndCache(request, cacheName);
}

/**
 * Stale While Revalidate - Return cache, update in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cached = await caches.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        const responseWithDate = await addCacheDate(response);
        cache.put(request, responseWithDate);
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  const response = await fetchPromise;
  if (response) {
    return response;
  }
  
  // Network failed and no cache
  return new Response(
    JSON.stringify({ error: 'No data available', offline: true }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Navigation Strategy - For page navigations
 */
async function navigationStrategy(request) {
  try {
    // Try network first for navigations
    const response = await fetch(request);
    
    // Cache successful navigations
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback HTML
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Você está offline</h1><p>Por favor, verifique sua conexão.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseWithDate = await addCacheDate(response);
      cache.put(request, responseWithDate);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}

async function addCacheDate(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', Date.now().toString());
  
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

function isNetworkFirstRoute(pathname) {
  return NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

function isCacheFirstRoute(pathname) {
  return CACHE_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

function isStaleWhileRevalidateRoute(pathname) {
  return STALE_WHILE_REVALIDATE_ROUTES.some(route => pathname.startsWith(route));
}

function isMediaRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('image/') || 
         accept.includes('video/') || 
         accept.includes('audio/');
}

function shouldCacheExternalResource(url) {
  const allowedOrigins = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net'
  ];
  return allowedOrigins.some(origin => url.hostname.includes(origin));
}

function getMaxAgeForCache(cacheName) {
  if (cacheName.startsWith('api-')) return CACHE_MAX_AGE.api;
  if (cacheName.startsWith('media-')) return CACHE_MAX_AGE.media;
  return CACHE_MAX_AGE.static;
}

// ============================================
// Push Notifications
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'TécnicoCursos',
    body: 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// Background Sync
// ============================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(processSyncQueue(event.tag));
  }
});

async function processSyncQueue(tag) {
  const type = tag.replace('sync-', '');
  
  // Open IndexedDB and get pending items
  try {
    const db = await openIndexedDB();
    const items = await getQueuedItems(db, type);
    
    for (const item of items) {
      try {
        const response = await fetch(`/api/sync/${item.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          await removeQueuedItem(db, item.id);
        }
      } catch (error) {
        console.error('[SW] Sync failed for item:', item.id, error);
      }
    }
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        tag
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

// ============================================
// IndexedDB Helpers (for background sync)
// ============================================

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tecnico-cursos-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getQueuedItems(db, type) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('type');
    const request = index.getAll(type);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function removeQueuedItem(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// Message Handler (from client)
// ============================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name)));
    });
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// ============================================
// Periodic Background Sync (if supported)
// ============================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  // Prefetch important content when device is online and idle
  const contentToSync = [
    '/api/templates?limit=10',
    '/api/courses?limit=5'
  ];
  
  for (const url of contentToSync) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(url, response);
      }
    } catch (error) {
      console.warn('[SW] Failed to sync:', url);
    }
  }
}

console.log('[SW] Service Worker v' + CACHE_VERSION + ' loaded - Enhanced PWA Support');
