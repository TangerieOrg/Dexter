module.exports = {
    globDirectory: "dist",
    globPatterns: [
        "**/*.{html,js,css,png,svg,jpg,gif,json,woff,woff2,eot,ico}"
    ],
    swDest: "dist/service-worker.js",
    clientsClaim: true,
    skipWaiting: true,
    modifyURLPrefix: {
        '': '/dexter/'
    },
    cacheId: "Dexter",
    navigateFallback: "/dexter/"
};