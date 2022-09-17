let cacheName = "Notes-MVC";
filesToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/index.js',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                cache.addAll(filesToCache);
            })
    );
    console.log("installed");
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(keys
                    .filter(key => key != cacheName)
                    .map(key => caches.delete(key))
                )
            })
    )
    console.log("Activated");
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request)
            .then(res => {
                return res || fetch(e.request)
                .then(res => {
                    return caches.open(cacheName).then(cache => {
                        cache.put(e.request, res.clone());
                        return res;
                    })
                });
            })
    );
});