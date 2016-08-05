Full service worker starter 
===========================

> More realistic service worker starter

Check here: 

## Overview

This is some sort of a second part of my simple [sw-starter](https://github.com/YerkoPalma/sw-starter). The main differences here are:

* No `localStorage`, instead [`Dexie.js`](https://github.com/dfahlander/Dexie.js) is used
* The service-worker is now generated with [`sw-precache`](https://github.com/GoogleChrome/sw-precache)
* The _offline first_ strategy is a bit improved

## Knowledge

* `sw-precache` only cache the assets of the proyect, and to cache the data, ~~should use different `fetch` handler~~ use only the local database.
* In the `sw-precache` should be included specificly the files to cache to ignore junk files
* 

## DB specification

### Dexie

```javascript
// _id field assigned by default
class DexieModel {
  // fields

  // REST methods
}

let todos = new DexieModel({
  title: '',          // default values
  checked: false,     // default values
  date: new Date()    // default values
})

// add
const newTodo = todos.add({
  title: 'My todo'
})
/*
   {
     title: 'My todo',
     checked: false,
     date: 2016-08-05 15:15 +06 UTC,
     _id: 321354
   }
 */

// get
```

### Firebase

```javascript
class FirebaseModel {
  
}

let todos = new FirebaseModel('url to firebase.json')
```

## License

MIT &copy; [YerkoPalma](https://github.com/YerkoPalma)
