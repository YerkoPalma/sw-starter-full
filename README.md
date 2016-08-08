Full service worker starter 
===========================

> More realistic service worker starter

Check here: 

## Overview

This is some sort of a second part of my simple [sw-starter](https://github.com/YerkoPalma/sw-starter). The main differences here are:

- No `localStorage`, instead [`Dexie.js`](https://github.com/dfahlander/Dexie.js) is used
- The service-worker is now generated with [`sw-precache`](https://github.com/GoogleChrome/sw-precache)
- The _offline first_ strategy is a bit improved

## Knowledge

- `sw-precache` only cache the assets of the proyect, and to cache the data, ~~should use different _fetch_ handler~~ use only the local database.
- In the `sw-precache` should be included specificly the files to cache to ignore junk files.
- Firebase use only Objects, no arrays, so, some hack need to be done to properly handle data.

## License

MIT &copy; [YerkoPalma](https://github.com/YerkoPalma)
