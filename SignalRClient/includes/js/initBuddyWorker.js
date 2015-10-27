importScripts(
    "OTR/build/dep/salsa20.js",
    "OTR/build/dep/bigint.js",
    "OTR/build/dep/crypto.js",
    "OTR/build/dep/eventemitter.js",
    "OTR/build/otr.min.js"
);

self.onmessage = function (e) {
    self.postMessage(new OTR(e.options));
};