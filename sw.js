const CACHE_NAME = "moon-app-shell-v0.4.1-p7-01";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./app_icon.png",
  "./app_icon_192.png",
  "./app_icon_512.png",
  "./favicon.ico",
  "./js/data.js",
  "./js/features/terms.js",
  "./js/imageStore.js",
  "./js/integrity.js",
  "./js/migrate.js",
  "./js/storage.js",
  "./js/imageMigration.js",
  "./js/imageHealth.js",
  "./js/features/backup-health-ui.js",
  "./js/features/storage-health.js",
  "./js/render.js",
  "./js/features/members.js",
  "./js/features/rooms.js",
  "./js/features/messages.js",
  "./js/features/polls.js",
  "./js/features/handoff.js",
  "./js/features/tasks.js",
  "./js/features/care.js",
  "./js/features/fronting.js",
  "./js/vendor/qrcode-generator.js",
  "./js/vendor/jsqr.js",
  "./js/features/system-card.js",
  "./js/features/ledger.js",
  "./js/features/encrypted-backup.js",
  "./js/features/import-export.js",
  "./js/features/arrival.js",
  "./js/features/search.js",
  "./js/features/timeline.js",
  "./js/app.js",
  "./js/sw-register.js"
];

const APP_SHELL_PATHS = new Set(APP_SHELL.map(function(path){
  return new URL(path, self.registration.scope).pathname;
}));

function isHttpProtocol(url){
  return url.protocol === "http:" || url.protocol === "https:";
}

function isAppShellRequest(request){
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (!isHttpProtocol(url)) return false;
  if (url.origin !== self.location.origin) return false;
  if (url.protocol === "blob:" || url.protocol === "data:") return false;
  if (url.pathname.endsWith(".json") || url.pathname.endsWith(".moonenc.json")) return false;

  return APP_SHELL_PATHS.has(url.pathname);
}

async function refreshAppShell(request){
  const response = await fetch(request);
  if (!response || !response.ok) {
    throw new Error("app shell fetch failed: " + request.url);
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function appShellResponse(request){
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) {
    refreshAppShell(request).catch(function(err){
      console.warn("SW app shell refresh failed.", err);
    });
    return cached;
  }

  try {
    return await refreshAppShell(request);
  } catch (err) {
    const fallback = await caches.match("./", { ignoreSearch: true }) || await caches.match("./index.html", { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (key !== CACHE_NAME && key.indexOf("moon-app-shell-") === 0) {
          return caches.delete(key);
        }
        return undefined;
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  if (!isAppShellRequest(event.request)) return;
  event.respondWith(appShellResponse(event.request));
});
