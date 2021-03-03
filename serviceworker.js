// Assets to save with the service worker
const baseAssets = [
    './',
    './src/main.js',
    './src/style.css',
    "./images/logoM.png"
];

// Install service worker and add assets
self.addEventListener("install", async e => { 
    const cache = await caches.open('static');
    cache.addAll(baseAssets); 
});

// when fetch request happens, check cache first
self.addEventListener('fetch', e => {
    let url = new URL(e.request.url);

    if(url.origin === location.origin) {
        e.respondWith(cacheFirst(e.request));
    }
})

const cacheFirst = async req => {
    return await caches.match(req) || fetch(req);
}