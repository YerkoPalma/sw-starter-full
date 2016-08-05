(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global navigator */
const Dexie = require('dexie')
const firebase = require('firebase')
const uiManager = require('./ui')

'use strict'

// Initialize Firebase
var config = {
  apiKey: 'AIzaSyAnW2qoCAtXu5-JbeXb5TR-fTiYqrlY63U',
  authDomain: 'sw-full.firebaseapp.com',
  databaseURL: 'https://sw-full.firebaseio.com',
  storageBucket: 'sw-full.appspot.com'
}
firebase.initializeApp(config)
const rootRef = firebase.database().ref('todos')

let app = {}
let db = new Dexie('todos')
db.version(1).stores({
  todos: '++id,title,checked,date'
})

db.open().catch(function (err) {
  console.log(err)
})

// define Todo class
function Todo (args) {
  this.title = args ? args.title : ''
  this.checked = args ? args.checked : false
  this.date = args ? args.date : new Date()
}

// the data
app.todos = []

// tells if there is difference between online data and local data
app.shouldUpdate = false

/**
 * Methods should handle offline mode by checking navigator.online.
 * In fact, offline is supported by default, and online only when
 * navigator.online === true.
 */

/**
 * Get the list of all todos
 */
app.getTodos = function () {
  // update from the database
  // if there is connection, try to get data from firbase
  if (navigator.online) {
    rootRef.once('value')
      .then(function (todos) {
        app.todos = todos

        // update the local db with whatever is in firebase
        db.todos.clear()
        db.bulkAdd(todos)
      }).catch(function (err) {
        console.log('[app] Error ' + err)
      })
  } else {
    app.todos = db.todos
    app.shouldUpdate = true
  }
  // update the view
  uiManager.updateTodos(app.todos)
}

/**
 * Add a new todo
 *
 * @param {String} todoTitle
 */
app.addTodo = function (todoTitle) {
  // creates the todo
  const todo = new Todo({
    title: todoTitle,
    checked: false
  })
  // saves to local db
  const todoId = db.todos.add(todo)
  todo.id = todoId

  // try to save asynchronously to firebase
  if (navigator.online) {
    var newTodoRef = rootRef.push()
    newTodoRef.set(todo)
  } else {
    app.shouldUpdate = true
  }
  app.todos.push(todo)
  // update the view
  uiManager.addTodo(todo)
}

/**
 * Remove a todo
 *
 * @param {Todo} todo
 * @return {Boolean}
 */
app.removeTodo = function (todo) {
  // delete from local db
  db.todos.delete(todo.id)

  // delete from firebase

  // update the view
  uiManager.removeTodo(todo)
}

/**
 * Update a single todo
 *
 * @param {Todo} oldTodo
 * @param {Todo} newTodo
 * @return {Boolean}
 */
app.setTodo = function (oldTodo, newTodo) {
  // update local db
  db.todos.update(oldTodo.id, newTodo).then(function (updated) {
    if (updated) {
      console.log('[app.setTodo] todo updated')
    } else {
      console.log('[app.setTodo] todo NOT updated')
    }
  })

  // update firebase

  // update the view
  uiManager.setTodo(oldTodo, newTodo)
}

/**
 * Set all todos as finished
 *
 * @return {Boolean}
 */
app.checkAll = function () {
  // check all todos in local db
  const checkedTodos = db.todos.toArray().map(function (todo) {
    todo.checked = true
    return todo
  })
  db.todos.bulkPut(checkedTodos).then(function () {
    console.log('[app] checked all todos')
  }).catch(function (err) {
    console.log(err)
  })
  // update the view
  uiManager.checkAll()
}

/**
 * Update local data from database, only after recovering internet connection
 *
 * @return {Boolean}
 */
app.update = function () {
  // only update if needed
  if (app.shouldUpdate) {

  }
}

/**
 * If conectivity changes back to online, update if there is difference in local data and online data
 */
window.addEventListener('online', app.update())

// for first load
app.todos = db.todos
if (app.todos) {
  // update the DOM
  uiManager.updateTodos(app.todos)
} else {
  app.getTodos()
}

// register the service worker
if ('serviceWorker' in navigator) {
  navigator
    .serviceWorker
    .register('/service-worker.js')
    .then(function () {
      console.log('[app]', 'Service Worker Registered')
    })
}

},{"./ui":5,"dexie":2,"firebase":3}],2:[function(require,module,exports){
(function (global){
(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
   typeof define === 'function' && define.amd ? define(factory) :
   global.Dexie = factory();
}(this, function () { 'use strict';

   // By default, debug will be true only if platform is a web platform and its page is served from localhost.
   // When debug = true, error's stacks will contain asyncronic long stacks.
   var debug = typeof location !== 'undefined' &&
   // By default, use debug mode if served from localhost.
   /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);

   function setDebug(value, filter) {
       debug = value;
       libraryFilter = filter;
   }

   var libraryFilter = function () {
       return true;
   };

   var NEEDS_THROW_FOR_STACK = !new Error("").stack;

   function getErrorWithStack() {
       "use strict";

       if (NEEDS_THROW_FOR_STACK) try {
           // Doing something naughty in strict mode here to trigger a specific error
           // that can be explicitely ignored in debugger's exception settings.
           // If we'd just throw new Error() here, IE's debugger's exception settings
           // will just consider it as "exception thrown by javascript code" which is
           // something you wouldn't want it to ignore.
           getErrorWithStack.arguments;
           throw new Error(); // Fallback if above line don't throw.
       } catch (e) {
           return e;
       }
       return new Error();
   }

   function prettyStack(exception, numIgnoredFrames) {
       var stack = exception.stack;
       if (!stack) return "";
       numIgnoredFrames = numIgnoredFrames || 0;
       if (stack.indexOf(exception.name) === 0) numIgnoredFrames += (exception.name + exception.message).split('\n').length;
       return stack.split('\n').slice(numIgnoredFrames).filter(libraryFilter).map(function (frame) {
           return "\n" + frame;
       }).join('');
   }

   function nop() {}
   function mirror(val) {
       return val;
   }
   function pureFunctionChain(f1, f2) {
       // Enables chained events that takes ONE argument and returns it to the next function in chain.
       // This pattern is used in the hook("reading") event.
       if (f1 == null || f1 === mirror) return f2;
       return function (val) {
           return f2(f1(val));
       };
   }

   function callBoth(on1, on2) {
       return function () {
           on1.apply(this, arguments);
           on2.apply(this, arguments);
       };
   }

   function hookCreatingChain(f1, f2) {
       // Enables chained events that takes several arguments and may modify first argument by making a modification and then returning the same instance.
       // This pattern is used in the hook("creating") event.
       if (f1 === nop) return f2;
       return function () {
           var res = f1.apply(this, arguments);
           if (res !== undefined) arguments[0] = res;
           var onsuccess = this.onsuccess,
               // In case event listener has set this.onsuccess
           onerror = this.onerror; // In case event listener has set this.onerror
           this.onsuccess = null;
           this.onerror = null;
           var res2 = f2.apply(this, arguments);
           if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
           if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
           return res2 !== undefined ? res2 : res;
       };
   }

   function hookDeletingChain(f1, f2) {
       if (f1 === nop) return f2;
       return function () {
           f1.apply(this, arguments);
           var onsuccess = this.onsuccess,
               // In case event listener has set this.onsuccess
           onerror = this.onerror; // In case event listener has set this.onerror
           this.onsuccess = this.onerror = null;
           f2.apply(this, arguments);
           if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
           if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
       };
   }

   function hookUpdatingChain(f1, f2) {
       if (f1 === nop) return f2;
       return function (modifications) {
           var res = f1.apply(this, arguments);
           extend(modifications, res); // If f1 returns new modifications, extend caller's modifications with the result before calling next in chain.
           var onsuccess = this.onsuccess,
               // In case event listener has set this.onsuccess
           onerror = this.onerror; // In case event listener has set this.onerror
           this.onsuccess = null;
           this.onerror = null;
           var res2 = f2.apply(this, arguments);
           if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
           if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
           return res === undefined ? res2 === undefined ? undefined : res2 : extend(res, res2);
       };
   }

   function reverseStoppableEventChain(f1, f2) {
       if (f1 === nop) return f2;
       return function () {
           if (f2.apply(this, arguments) === false) return false;
           return f1.apply(this, arguments);
       };
   }

   function promisableChain(f1, f2) {
       if (f1 === nop) return f2;
       return function () {
           var res = f1.apply(this, arguments);
           if (res && typeof res.then === 'function') {
               var thiz = this,
                   i = arguments.length,
                   args = new Array(i);
               while (i--) {
                   args[i] = arguments[i];
               }return res.then(function () {
                   return f2.apply(thiz, args);
               });
           }
           return f2.apply(this, arguments);
       };
   }

   var keys = Object.keys;
   var isArray = Array.isArray;
   var _global = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;

   function extend(obj, extension) {
       if (typeof extension !== 'object') return obj;
       keys(extension).forEach(function (key) {
           obj[key] = extension[key];
       });
       return obj;
   }

   var getProto = Object.getPrototypeOf;
   var _hasOwn = {}.hasOwnProperty;
   function hasOwn(obj, prop) {
       return _hasOwn.call(obj, prop);
   }

   function props(proto, extension) {
       if (typeof extension === 'function') extension = extension(getProto(proto));
       keys(extension).forEach(function (key) {
           setProp(proto, key, extension[key]);
       });
   }

   function setProp(obj, prop, functionOrGetSet, options) {
       Object.defineProperty(obj, prop, extend(functionOrGetSet && hasOwn(functionOrGetSet, "get") && typeof functionOrGetSet.get === 'function' ? { get: functionOrGetSet.get, set: functionOrGetSet.set, configurable: true } : { value: functionOrGetSet, configurable: true, writable: true }, options));
   }

   function derive(Child) {
       return {
           from: function (Parent) {
               Child.prototype = Object.create(Parent.prototype);
               setProp(Child.prototype, "constructor", Child);
               return {
                   extend: props.bind(null, Child.prototype)
               };
           }
       };
   }

   var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

   function getPropertyDescriptor(obj, prop) {
       var pd = getOwnPropertyDescriptor(obj, prop),
           proto;
       return pd || (proto = getProto(obj)) && getPropertyDescriptor(proto, prop);
   }

   var _slice = [].slice;
   function slice(args, start, end) {
       return _slice.call(args, start, end);
   }

   function override(origFunc, overridedFactory) {
       return overridedFactory(origFunc);
   }

   function doFakeAutoComplete(fn) {
       var to = setTimeout(fn, 1000);
       clearTimeout(to);
   }

   function assert(b) {
       if (!b) throw new exceptions.Internal("Assertion failed");
   }

   function asap(fn) {
       if (_global.setImmediate) setImmediate(fn);else setTimeout(fn, 0);
   }

   /** Generate an object (hash map) based on given array.
    * @param extractor Function taking an array item and its index and returning an array of 2 items ([key, value]) to
    *        instert on the resulting object for each item in the array. If this function returns a falsy value, the
    *        current item wont affect the resulting object.
    */
   function arrayToObject(array, extractor) {
       return array.reduce(function (result, item, i) {
           var nameAndValue = extractor(item, i);
           if (nameAndValue) result[nameAndValue[0]] = nameAndValue[1];
           return result;
       }, {});
   }

   function trycatcher(fn, reject) {
       return function () {
           try {
               fn.apply(this, arguments);
           } catch (e) {
               reject(e);
           }
       };
   }

   function tryCatch(fn, onerror, args) {
       try {
           fn.apply(null, args);
       } catch (ex) {
           onerror && onerror(ex);
       }
   }

   function rejection(err, uncaughtHandler) {
       // Get the call stack and return a rejected promise.
       var rv = Promise.reject(err);
       return uncaughtHandler ? rv.uncaught(uncaughtHandler) : rv;
   }

   function getByKeyPath(obj, keyPath) {
       // http://www.w3.org/TR/IndexedDB/#steps-for-extracting-a-key-from-a-value-using-a-key-path
       if (hasOwn(obj, keyPath)) return obj[keyPath]; // This line is moved from last to first for optimization purpose.
       if (!keyPath) return obj;
       if (typeof keyPath !== 'string') {
           var rv = [];
           for (var i = 0, l = keyPath.length; i < l; ++i) {
               var val = getByKeyPath(obj, keyPath[i]);
               rv.push(val);
           }
           return rv;
       }
       var period = keyPath.indexOf('.');
       if (period !== -1) {
           var innerObj = obj[keyPath.substr(0, period)];
           return innerObj === undefined ? undefined : getByKeyPath(innerObj, keyPath.substr(period + 1));
       }
       return undefined;
   }

   function setByKeyPath(obj, keyPath, value) {
       if (!obj || keyPath === undefined) return;
       if ('isFrozen' in Object && Object.isFrozen(obj)) return;
       if (typeof keyPath !== 'string' && 'length' in keyPath) {
           assert(typeof value !== 'string' && 'length' in value);
           for (var i = 0, l = keyPath.length; i < l; ++i) {
               setByKeyPath(obj, keyPath[i], value[i]);
           }
       } else {
           var period = keyPath.indexOf('.');
           if (period !== -1) {
               var currentKeyPath = keyPath.substr(0, period);
               var remainingKeyPath = keyPath.substr(period + 1);
               if (remainingKeyPath === "") {
                   if (value === undefined) delete obj[currentKeyPath];else obj[currentKeyPath] = value;
               } else {
                   var innerObj = obj[currentKeyPath];
                   if (!innerObj) innerObj = obj[currentKeyPath] = {};
                   setByKeyPath(innerObj, remainingKeyPath, value);
               }
           } else {
               if (value === undefined) delete obj[keyPath];else obj[keyPath] = value;
           }
       }
   }

   function delByKeyPath(obj, keyPath) {
       if (typeof keyPath === 'string') setByKeyPath(obj, keyPath, undefined);else if ('length' in keyPath) [].map.call(keyPath, function (kp) {
           setByKeyPath(obj, kp, undefined);
       });
   }

   function shallowClone(obj) {
       var rv = {};
       for (var m in obj) {
           if (hasOwn(obj, m)) rv[m] = obj[m];
       }
       return rv;
   }

   function deepClone(any) {
       if (!any || typeof any !== 'object') return any;
       var rv;
       if (isArray(any)) {
           rv = [];
           for (var i = 0, l = any.length; i < l; ++i) {
               rv.push(deepClone(any[i]));
           }
       } else if (any instanceof Date) {
           rv = new Date();
           rv.setTime(any.getTime());
       } else {
           rv = any.constructor ? Object.create(any.constructor.prototype) : {};
           for (var prop in any) {
               if (hasOwn(any, prop)) {
                   rv[prop] = deepClone(any[prop]);
               }
           }
       }
       return rv;
   }

   function getObjectDiff(a, b, rv, prfx) {
       // Compares objects a and b and produces a diff object.
       rv = rv || {};
       prfx = prfx || '';
       keys(a).forEach(function (prop) {
           if (!hasOwn(b, prop)) rv[prfx + prop] = undefined; // Property removed
           else {
                   var ap = a[prop],
                       bp = b[prop];
                   if (typeof ap === 'object' && typeof bp === 'object' && ap && bp && ap.constructor === bp.constructor)
                       // Same type of object but its properties may have changed
                       getObjectDiff(ap, bp, rv, prfx + prop + ".");else if (ap !== bp) rv[prfx + prop] = b[prop]; // Primitive value changed
               }
       });
       keys(b).forEach(function (prop) {
           if (!hasOwn(a, prop)) {
               rv[prfx + prop] = b[prop]; // Property added
           }
       });
       return rv;
   }

   // If first argument is iterable or array-like, return it as an array
   var iteratorSymbol = typeof Symbol !== 'undefined' && Symbol.iterator;
   var getIteratorOf = iteratorSymbol ? function (x) {
       var i;
       return x != null && (i = x[iteratorSymbol]) && i.apply(x);
   } : function () {
       return null;
   };

   var NO_CHAR_ARRAY = {};
   // Takes one or several arguments and returns an array based on the following criteras:
   // * If several arguments provided, return arguments converted to an array in a way that
   //   still allows javascript engine to optimize the code.
   // * If single argument is an array, return a clone of it.
   // * If this-pointer equals NO_CHAR_ARRAY, don't accept strings as valid iterables as a special
   //   case to the two bullets below.
   // * If single argument is an iterable, convert it to an array and return the resulting array.
   // * If single argument is array-like (has length of type number), convert it to an array.
   function getArrayOf(arrayLike) {
       var i, a, x, it;
       if (arguments.length === 1) {
           if (isArray(arrayLike)) return arrayLike.slice();
           if (this === NO_CHAR_ARRAY && typeof arrayLike === 'string') return [arrayLike];
           if (it = getIteratorOf(arrayLike)) {
               a = [];
               while (x = it.next(), !x.done) {
                   a.push(x.value);
               }return a;
           }
           if (arrayLike == null) return [arrayLike];
           i = arrayLike.length;
           if (typeof i === 'number') {
               a = new Array(i);
               while (i--) {
                   a[i] = arrayLike[i];
               }return a;
           }
           return [arrayLike];
       }
       i = arguments.length;
       a = new Array(i);
       while (i--) {
           a[i] = arguments[i];
       }return a;
   }

   var concat = [].concat;
   function flatten(a) {
       return concat.apply([], a);
   }

   var dexieErrorNames = ['Modify', 'Bulk', 'OpenFailed', 'VersionChange', 'Schema', 'Upgrade', 'InvalidTable', 'MissingAPI', 'NoSuchDatabase', 'InvalidArgument', 'SubTransaction', 'Unsupported', 'Internal', 'DatabaseClosed', 'IncompatiblePromise'];

   var idbDomErrorNames = ['Unknown', 'Constraint', 'Data', 'TransactionInactive', 'ReadOnly', 'Version', 'NotFound', 'InvalidState', 'InvalidAccess', 'Abort', 'Timeout', 'QuotaExceeded', 'Syntax', 'DataClone'];

   var errorList = dexieErrorNames.concat(idbDomErrorNames);

   var defaultTexts = {
       VersionChanged: "Database version changed by other database connection",
       DatabaseClosed: "Database has been closed",
       Abort: "Transaction aborted",
       TransactionInactive: "Transaction has already completed or failed"
   };

   //
   // DexieError - base class of all out exceptions.
   //
   function DexieError(name, msg) {
       // Reason we don't use ES6 classes is because:
       // 1. It bloats transpiled code and increases size of minified code.
       // 2. It doesn't give us much in this case.
       // 3. It would require sub classes to call super(), which
       //    is not needed when deriving from Error.
       this._e = getErrorWithStack();
       this.name = name;
       this.message = msg;
   }

   derive(DexieError).from(Error).extend({
       stack: {
           get: function () {
               return this._stack || (this._stack = this.name + ": " + this.message + prettyStack(this._e, 2));
           }
       },
       toString: function () {
           return this.name + ": " + this.message;
       }
   });

   function getMultiErrorMessage(msg, failures) {
       return msg + ". Errors: " + failures.map(function (f) {
           return f.toString();
       }).filter(function (v, i, s) {
           return s.indexOf(v) === i;
       }) // Only unique error strings
       .join('\n');
   }

   //
   // ModifyError - thrown in WriteableCollection.modify()
   // Specific constructor because it contains members failures and failedKeys.
   //
   function ModifyError(msg, failures, successCount, failedKeys) {
       this._e = getErrorWithStack();
       this.failures = failures;
       this.failedKeys = failedKeys;
       this.successCount = successCount;
   }
   derive(ModifyError).from(DexieError);

   function BulkError(msg, failures) {
       this._e = getErrorWithStack();
       this.name = "BulkError";
       this.failures = failures;
       this.message = getMultiErrorMessage(msg, failures);
   }
   derive(BulkError).from(DexieError);

   //
   //
   // Dynamically generate error names and exception classes based
   // on the names in errorList.
   //
   //

   // Map of {ErrorName -> ErrorName + "Error"}
   var errnames = errorList.reduce(function (obj, name) {
       return obj[name] = name + "Error", obj;
   }, {});

   // Need an alias for DexieError because we're gonna create subclasses with the same name.
   var BaseException = DexieError;
   // Map of {ErrorName -> exception constructor}
   var exceptions = errorList.reduce(function (obj, name) {
       // Let the name be "DexieError" because this name may
       // be shown in call stack and when debugging. DexieError is
       // the most true name because it derives from DexieError,
       // and we cannot change Function.name programatically without
       // dynamically create a Function object, which would be considered
       // 'eval-evil'.
       var fullName = name + "Error";
       function DexieError(msgOrInner, inner) {
           this._e = getErrorWithStack();
           this.name = fullName;
           if (!msgOrInner) {
               this.message = defaultTexts[name] || fullName;
               this.inner = null;
           } else if (typeof msgOrInner === 'string') {
               this.message = msgOrInner;
               this.inner = inner || null;
           } else if (typeof msgOrInner === 'object') {
               this.message = msgOrInner.name + ' ' + msgOrInner.message;
               this.inner = msgOrInner;
           }
       }
       derive(DexieError).from(BaseException);
       obj[name] = DexieError;
       return obj;
   }, {});

   // Use ECMASCRIPT standard exceptions where applicable:
   exceptions.Syntax = SyntaxError;
   exceptions.Type = TypeError;
   exceptions.Range = RangeError;

   var exceptionMap = idbDomErrorNames.reduce(function (obj, name) {
       obj[name + "Error"] = exceptions[name];
       return obj;
   }, {});

   function mapError(domError, message) {
       if (!domError || domError instanceof DexieError || domError instanceof TypeError || domError instanceof SyntaxError || !domError.name || !exceptionMap[domError.name]) return domError;
       var rv = new exceptionMap[domError.name](message || domError.message, domError);
       if ("stack" in domError) {
           // Derive stack from inner exception if it has a stack
           setProp(rv, "stack", { get: function () {
                   return this.inner.stack;
               } });
       }
       return rv;
   }

   var fullNameExceptions = errorList.reduce(function (obj, name) {
       if (["Syntax", "Type", "Range"].indexOf(name) === -1) obj[name + "Error"] = exceptions[name];
       return obj;
   }, {});

   fullNameExceptions.ModifyError = ModifyError;
   fullNameExceptions.DexieError = DexieError;
   fullNameExceptions.BulkError = BulkError;

   function Events(ctx) {
       var evs = {};
       var rv = function (eventName, subscriber) {
           if (subscriber) {
               // Subscribe. If additional arguments than just the subscriber was provided, forward them as well.
               var i = arguments.length,
                   args = new Array(i - 1);
               while (--i) {
                   args[i - 1] = arguments[i];
               }evs[eventName].subscribe.apply(null, args);
               return ctx;
           } else if (typeof eventName === 'string') {
               // Return interface allowing to fire or unsubscribe from event
               return evs[eventName];
           }
       };
       rv.addEventType = add;

       for (var i = 1, l = arguments.length; i < l; ++i) {
           add(arguments[i]);
       }

       return rv;

       function add(eventName, chainFunction, defaultFunction) {
           if (typeof eventName === 'object') return addConfiguredEvents(eventName);
           if (!chainFunction) chainFunction = reverseStoppableEventChain;
           if (!defaultFunction) defaultFunction = nop;

           var context = {
               subscribers: [],
               fire: defaultFunction,
               subscribe: function (cb) {
                   if (context.subscribers.indexOf(cb) === -1) {
                       context.subscribers.push(cb);
                       context.fire = chainFunction(context.fire, cb);
                   }
               },
               unsubscribe: function (cb) {
                   context.subscribers = context.subscribers.filter(function (fn) {
                       return fn !== cb;
                   });
                   context.fire = context.subscribers.reduce(chainFunction, defaultFunction);
               }
           };
           evs[eventName] = rv[eventName] = context;
           return context;
       }

       function addConfiguredEvents(cfg) {
           // events(this, {reading: [functionChain, nop]});
           keys(cfg).forEach(function (eventName) {
               var args = cfg[eventName];
               if (isArray(args)) {
                   add(eventName, cfg[eventName][0], cfg[eventName][1]);
               } else if (args === 'asap') {
                   // Rather than approaching event subscription using a functional approach, we here do it in a for-loop where subscriber is executed in its own stack
                   // enabling that any exception that occur wont disturb the initiator and also not nescessary be catched and forgotten.
                   var context = add(eventName, mirror, function fire() {
                       // Optimazation-safe cloning of arguments into args.
                       var i = arguments.length,
                           args = new Array(i);
                       while (i--) {
                           args[i] = arguments[i];
                       } // All each subscriber:
                       context.subscribers.forEach(function (fn) {
                           asap(function fireEvent() {
                               fn.apply(null, args);
                           });
                       });
                   });
               } else throw new exceptions.InvalidArgument("Invalid event config");
           });
       }
   }

   //
   // Promise Class for Dexie library
   //
   // I started out writing this Promise class by copying promise-light (https://github.com/taylorhakes/promise-light) by
   // https://github.com/taylorhakes - an A+ and ECMASCRIPT 6 compliant Promise implementation.
   //
   // Modifications needed to be done to support indexedDB because it wont accept setTimeout()
   // (See discussion: https://github.com/promises-aplus/promises-spec/issues/45) .
   // This topic was also discussed in the following thread: https://github.com/promises-aplus/promises-spec/issues/45
   //
   // This implementation will not use setTimeout or setImmediate when it's not needed. The behavior is 100% Promise/A+ compliant since
   // the caller of new Promise() can be certain that the promise wont be triggered the lines after constructing the promise.
   //
   // In previous versions this was fixed by not calling setTimeout when knowing that the resolve() or reject() came from another
   // tick. In Dexie v1.4.0, I've rewritten the Promise class entirely. Just some fragments of promise-light is left. I use
   // another strategy now that simplifies everything a lot: to always execute callbacks in a new tick, but have an own microTick
   // engine that is used instead of setImmediate() or setTimeout().
   // Promise class has also been optimized a lot with inspiration from bluebird - to avoid closures as much as possible.
   // Also with inspiration from bluebird, asyncronic stacks in debug mode.
   //
   // Specific non-standard features of this Promise class:
   // * Async static context support (Promise.PSD)
   // * Promise.follow() method built upon PSD, that allows user to track all promises created from current stack frame
   //   and below + all promises that those promises creates or awaits.
   // * Detect any unhandled promise in a PSD-scope (PSD.onunhandled).
   //
   // David Fahlander, https://github.com/dfahlander
   //

   // Just a pointer that only this module knows about.
   // Used in Promise constructor to emulate a private constructor.
   var INTERNAL = {};

   // Async stacks (long stacks) must not grow infinitely.
   var LONG_STACKS_CLIP_LIMIT = 100;
   var MAX_LONG_STACKS = 20;
   var stack_being_generated = false;
   /* The default "nextTick" function used only for the very first promise in a promise chain.
      As soon as then promise is resolved or rejected, all next tasks will be executed in micro ticks
      emulated in this module. For indexedDB compatibility, this means that every method needs to 
      execute at least one promise before doing an indexedDB operation. Dexie will always call 
      db.ready().then() for every operation to make sure the indexedDB event is started in an
      emulated micro tick.
   */
   var schedulePhysicalTick = typeof setImmediate === 'undefined' ?
   // No support for setImmediate. No worry, setTimeout is only called
   // once time. Every tick that follows will be our emulated micro tick.
   // Could have uses setTimeout.bind(null, 0, physicalTick) if it wasnt for that FF13 and below has a bug
   function () {
       setTimeout(physicalTick, 0);
   } :
   // setImmediate supported. Modern platform. Also supports Function.bind().
   setImmediate.bind(null, physicalTick);

   // Confifurable through Promise.scheduler.
   // Don't export because it would be unsafe to let unknown
   // code call it unless they do try..catch within their callback.
   // This function can be retrieved through getter of Promise.scheduler though,
   // but users must not do Promise.scheduler (myFuncThatThrows exception)!
   var asap$1 = function (callback, args) {
       microtickQueue.push([callback, args]);
       if (needsNewPhysicalTick) {
           schedulePhysicalTick();
           needsNewPhysicalTick = false;
       }
   };

   var isOutsideMicroTick = true;
   var needsNewPhysicalTick = true;
   var unhandledErrors = [];
   var rejectingErrors = [];
   var currentFulfiller = null;
   var rejectionMapper = mirror;
   // Remove in next major when removing error mapping of DOMErrors and DOMExceptions

   var globalPSD = {
       global: true,
       ref: 0,
       unhandleds: [],
       onunhandled: globalError,
       //env: null, // Will be set whenever leaving a scope using wrappers.snapshot()
       finalize: function () {
           this.unhandleds.forEach(function (uh) {
               try {
                   globalError(uh[0], uh[1]);
               } catch (e) {}
           });
       }
   };

   var PSD = globalPSD;

   var microtickQueue = []; // Callbacks to call in this or next physical tick.
   var numScheduledCalls = 0; // Number of listener-calls left to do in this physical tick.
   var tickFinalizers = []; // Finalizers to call when there are no more async calls scheduled within current physical tick.

   // Wrappers are not being used yet. Their framework is functioning and can be used
   // to replace environment during a PSD scope (a.k.a. 'zone').
   /* **KEEP** export var wrappers = (() => {
       var wrappers = [];

       return {
           snapshot: () => {
               var i = wrappers.length,
                   result = new Array(i);
               while (i--) result[i] = wrappers[i].snapshot();
               return result;
           },
           restore: values => {
               var i = wrappers.length;
               while (i--) wrappers[i].restore(values[i]);
           },
           wrap: () => wrappers.map(w => w.wrap()),
           add: wrapper => {
               wrappers.push(wrapper);
           }
       };
   })();
   */

   function Promise(fn) {
       if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
       this._listeners = [];
       this.onuncatched = nop; // Deprecate in next major. Not needed. Better to use global error handler.

       // A library may set `promise._lib = true;` after promise is created to make resolve() or reject()
       // execute the microtask engine implicitely within the call to resolve() or reject().
       // To remain A+ compliant, a library must only set `_lib=true` if it can guarantee that the stack
       // only contains library code when calling resolve() or reject().
       // RULE OF THUMB: ONLY set _lib = true for promises explicitely resolving/rejecting directly from
       // global scope (event handler, timer etc)!
       this._lib = false;
       // Current async scope
       var psd = this._PSD = PSD;

       if (debug) {
           this._stackHolder = getErrorWithStack();
           this._prev = null;
           this._numPrev = 0; // Number of previous promises (for long stacks)
           linkToPreviousPromise(this, currentFulfiller);
       }

       if (typeof fn !== 'function') {
           if (fn !== INTERNAL) throw new TypeError('Not a function');
           // Private constructor (INTERNAL, state, value).
           // Used internally by Promise.resolve() and Promise.reject().
           this._state = arguments[1];
           this._value = arguments[2];
           if (this._state === false) handleRejection(this, this._value); // Map error, set stack and addPossiblyUnhandledError().
           return;
       }

       this._state = null; // null (=pending), false (=rejected) or true (=resolved)
       this._value = null; // error or result
       ++psd.ref; // Refcounting current scope
       executePromiseTask(this, fn);
   }

   props(Promise.prototype, {

       then: function (onFulfilled, onRejected) {
           var _this = this;

           var rv = new Promise(function (resolve, reject) {
               propagateToListener(_this, new Listener(onFulfilled, onRejected, resolve, reject));
           });
           debug && (!this._prev || this._state === null) && linkToPreviousPromise(rv, this);
           return rv;
       },

       _then: function (onFulfilled, onRejected) {
           // A little tinier version of then() that don't have to create a resulting promise.
           propagateToListener(this, new Listener(null, null, onFulfilled, onRejected));
       },

       catch: function (onRejected) {
           if (arguments.length === 1) return this.then(null, onRejected);
           // First argument is the Error type to catch
           var type = arguments[0],
               handler = arguments[1];
           return typeof type === 'function' ? this.then(null, function (err) {
               return(
                   // Catching errors by its constructor type (similar to java / c++ / c#)
                   // Sample: promise.catch(TypeError, function (e) { ... });
                   err instanceof type ? handler(err) : PromiseReject(err)
               );
           }) : this.then(null, function (err) {
               return(
                   // Catching errors by the error.name property. Makes sense for indexedDB where error type
                   // is always DOMError but where e.name tells the actual error type.
                   // Sample: promise.catch('ConstraintError', function (e) { ... });
                   err && err.name === type ? handler(err) : PromiseReject(err)
               );
           });
       },

       finally: function (onFinally) {
           return this.then(function (value) {
               onFinally();
               return value;
           }, function (err) {
               onFinally();
               return PromiseReject(err);
           });
       },

       // Deprecate in next major. Needed only for db.on.error.
       uncaught: function (uncaughtHandler) {
           var _this2 = this;

           // Be backward compatible and use "onuncatched" as the event name on this.
           // Handle multiple subscribers through reverseStoppableEventChain(). If a handler returns `false`, bubbling stops.
           this.onuncatched = reverseStoppableEventChain(this.onuncatched, uncaughtHandler);
           // In case caller does this on an already rejected promise, assume caller wants to point out the error to this promise and not
           // a previous promise. Reason: the prevous promise may lack onuncatched handler.
           if (this._state === false && unhandledErrors.indexOf(this) === -1) {
               // Replace unhandled error's destinaion promise with this one!
               unhandledErrors.some(function (p, i, l) {
                   return p._value === _this2._value && (l[i] = _this2);
               });
               // Actually we do this shit because we need to support db.on.error() correctly during db.open(). If we deprecate db.on.error, we could
               // take away this piece of code as well as the onuncatched and uncaught() method.
           }
           return this;
       },

       stack: {
           get: function () {
               if (this._stack) return this._stack;
               try {
                   stack_being_generated = true;
                   var stacks = getStack(this, [], MAX_LONG_STACKS);
                   var stack = stacks.join("\nFrom previous: ");
                   if (this._state !== null) this._stack = stack; // Stack may be updated on reject.
                   return stack;
               } finally {
                   stack_being_generated = false;
               }
           }
       }
   });

   function Listener(onFulfilled, onRejected, resolve, reject) {
       this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
       this.onRejected = typeof onRejected === 'function' ? onRejected : null;
       this.resolve = resolve;
       this.reject = reject;
       this.psd = PSD;
   }

   // Promise Static Properties
   props(Promise, {
       all: function () {
           var values = getArrayOf.apply(null, arguments); // Supports iterables, implicit arguments and array-like.
           return new Promise(function (resolve, reject) {
               if (values.length === 0) resolve([]);
               var remaining = values.length;
               values.forEach(function (a, i) {
                   return Promise.resolve(a).then(function (x) {
                       values[i] = x;
                       if (! --remaining) resolve(values);
                   }, reject);
               });
           });
       },

       resolve: function (value) {
           if (value && typeof value.then === 'function') return value;
           return new Promise(INTERNAL, true, value);
       },

       reject: PromiseReject,

       race: function () {
           var values = getArrayOf.apply(null, arguments);
           return new Promise(function (resolve, reject) {
               values.map(function (value) {
                   return Promise.resolve(value).then(resolve, reject);
               });
           });
       },

       PSD: {
           get: function () {
               return PSD;
           },
           set: function (value) {
               return PSD = value;
           }
       },

       newPSD: newScope,

       usePSD: usePSD,

       scheduler: {
           get: function () {
               return asap$1;
           },
           set: function (value) {
               asap$1 = value;
           }
       },

       rejectionMapper: {
           get: function () {
               return rejectionMapper;
           },
           set: function (value) {
               rejectionMapper = value;
           } // Map reject failures
       },

       follow: function (fn) {
           return new Promise(function (resolve, reject) {
               return newScope(function (resolve, reject) {
                   var psd = PSD;
                   psd.unhandleds = []; // For unhandled standard- or 3rd party Promises. Checked at psd.finalize()
                   psd.onunhandled = reject; // Triggered directly on unhandled promises of this library.
                   psd.finalize = callBoth(function () {
                       var _this3 = this;

                       // Unhandled standard or 3rd part promises are put in PSD.unhandleds and
                       // examined upon scope completion while unhandled rejections in this Promise
                       // will trigger directly through psd.onunhandled
                       run_at_end_of_this_or_next_physical_tick(function () {
                           _this3.unhandleds.length === 0 ? resolve() : reject(_this3.unhandleds[0]);
                       });
                   }, psd.finalize);
                   fn();
               }, resolve, reject);
           });
       },

       on: Events(null, { "error": [reverseStoppableEventChain, defaultErrorHandler] // Default to defaultErrorHandler
       })

   });

   /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
   function executePromiseTask(promise, fn) {
       // Promise Resolution Procedure:
       // https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
       try {
           fn(function (value) {
               if (promise._state !== null) return;
               if (value === promise) throw new TypeError('A promise cannot be resolved with itself.');
               var shouldExecuteTick = promise._lib && beginMicroTickScope();
               if (value && typeof value.then === 'function') {
                   executePromiseTask(promise, function (resolve, reject) {
                       value instanceof Promise ? value._then(resolve, reject) : value.then(resolve, reject);
                   });
               } else {
                   promise._state = true;
                   promise._value = value;
                   propagateAllListeners(promise);
               }
               if (shouldExecuteTick) endMicroTickScope();
           }, handleRejection.bind(null, promise)); // If Function.bind is not supported. Exception is handled in catch below
       } catch (ex) {
           handleRejection(promise, ex);
       }
   }

   function handleRejection(promise, reason) {
       rejectingErrors.push(reason);
       if (promise._state !== null) return;
       var shouldExecuteTick = promise._lib && beginMicroTickScope();
       reason = rejectionMapper(reason);
       promise._state = false;
       promise._value = reason;
       debug && reason !== null && typeof reason === 'object' && !reason._promise && tryCatch(function () {
           var origProp = getPropertyDescriptor(reason, "stack");
           reason._promise = promise;
           setProp(reason, "stack", {
               get: function () {
                   return stack_being_generated ? origProp && (origProp.get ? origProp.get.apply(reason) : origProp.value) : promise.stack;
               }
           });
       });
       // Add the failure to a list of possibly uncaught errors
       addPossiblyUnhandledError(promise);
       propagateAllListeners(promise);
       if (shouldExecuteTick) endMicroTickScope();
   }

   function propagateAllListeners(promise) {
       //debug && linkToPreviousPromise(promise);
       var listeners = promise._listeners;
       promise._listeners = [];
       for (var i = 0, len = listeners.length; i < len; ++i) {
           propagateToListener(promise, listeners[i]);
       }
       var psd = promise._PSD;
       --psd.ref || psd.finalize(); // if psd.ref reaches zero, call psd.finalize();
       if (numScheduledCalls === 0) {
           // If numScheduledCalls is 0, it means that our stack is not in a callback of a scheduled call,
           // and that no deferreds where listening to this rejection or success.
           // Since there is a risk that our stack can contain application code that may
           // do stuff after this code is finished that may generate new calls, we cannot
           // call finalizers here.
           ++numScheduledCalls;
           asap$1(function () {
               if (--numScheduledCalls === 0) finalizePhysicalTick(); // Will detect unhandled errors
           }, []);
       }
   }

   function propagateToListener(promise, listener) {
       if (promise._state === null) {
           promise._listeners.push(listener);
           return;
       }

       var cb = promise._state ? listener.onFulfilled : listener.onRejected;
       if (cb === null) {
           // This Listener doesnt have a listener for the event being triggered (onFulfilled or onReject) so lets forward the event to any eventual listeners on the Promise instance returned by then() or catch()
           return (promise._state ? listener.resolve : listener.reject)(promise._value);
       }
       var psd = listener.psd;
       ++psd.ref;
       ++numScheduledCalls;
       asap$1(callListener, [cb, promise, listener]);
   }

   function callListener(cb, promise, listener) {
       var outerScope = PSD;
       var psd = listener.psd;
       try {
           if (psd !== outerScope) {
               // **KEEP** outerScope.env = wrappers.snapshot(); // Snapshot outerScope's environment.
               PSD = psd;
               // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
           }

           // Set static variable currentFulfiller to the promise that is being fullfilled,
           // so that we connect the chain of promises (for long stacks support)
           currentFulfiller = promise;

           // Call callback and resolve our listener with it's return value.
           var value = promise._value,
               ret;
           if (promise._state) {
               ret = cb(value);
           } else {
               if (rejectingErrors.length) rejectingErrors = [];
               ret = cb(value);
               if (rejectingErrors.indexOf(value) === -1) markErrorAsHandled(promise); // Callback didnt do Promise.reject(err) nor reject(err) onto another promise.
           }
           listener.resolve(ret);
       } catch (e) {
           // Exception thrown in callback. Reject our listener.
           listener.reject(e);
       } finally {
           // Restore PSD, env and currentFulfiller.
           if (psd !== outerScope) {
               PSD = outerScope;
               // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment
           }
           currentFulfiller = null;
           if (--numScheduledCalls === 0) finalizePhysicalTick();
           --psd.ref || psd.finalize();
       }
   }

   function getStack(promise, stacks, limit) {
       if (stacks.length === limit) return stacks;
       var stack = "";
       if (promise._state === false) {
           var failure = promise._value,
               errorName,
               message;

           if (failure != null) {
               errorName = failure.name || "Error";
               message = failure.message || failure;
               stack = prettyStack(failure, 0);
           } else {
               errorName = failure; // If error is undefined or null, show that.
               message = "";
           }
           stacks.push(errorName + (message ? ": " + message : "") + stack);
       }
       if (debug) {
           stack = prettyStack(promise._stackHolder, 2);
           if (stack && stacks.indexOf(stack) === -1) stacks.push(stack);
           if (promise._prev) getStack(promise._prev, stacks, limit);
       }
       return stacks;
   }

   function linkToPreviousPromise(promise, prev) {
       // Support long stacks by linking to previous completed promise.
       var numPrev = prev ? prev._numPrev + 1 : 0;
       if (numPrev < LONG_STACKS_CLIP_LIMIT) {
           // Prohibit infinite Promise loops to get an infinite long memory consuming "tail".
           promise._prev = prev;
           promise._numPrev = numPrev;
       }
   }

   /* The callback to schedule with setImmediate() or setTimeout().
      It runs a virtual microtick and executes any callback registered in microtickQueue.
    */
   function physicalTick() {
       beginMicroTickScope() && endMicroTickScope();
   }

   function beginMicroTickScope() {
       var wasRootExec = isOutsideMicroTick;
       isOutsideMicroTick = false;
       needsNewPhysicalTick = false;
       return wasRootExec;
   }

   /* Executes micro-ticks without doing try..catch.
      This can be possible because we only use this internally and
      the registered functions are exception-safe (they do try..catch
      internally before calling any external method). If registering
      functions in the microtickQueue that are not exception-safe, this
      would destroy the framework and make it instable. So we don't export
      our asap method.
   */
   function endMicroTickScope() {
       var callbacks, i, l;
       do {
           while (microtickQueue.length > 0) {
               callbacks = microtickQueue;
               microtickQueue = [];
               l = callbacks.length;
               for (i = 0; i < l; ++i) {
                   var item = callbacks[i];
                   item[0].apply(null, item[1]);
               }
           }
       } while (microtickQueue.length > 0);
       isOutsideMicroTick = true;
       needsNewPhysicalTick = true;
   }

   function finalizePhysicalTick() {
       var unhandledErrs = unhandledErrors;
       unhandledErrors = [];
       unhandledErrs.forEach(function (p) {
           p._PSD.onunhandled.call(null, p._value, p);
       });
       var finalizers = tickFinalizers.slice(0); // Clone first because finalizer may remove itself from list.
       var i = finalizers.length;
       while (i) {
           finalizers[--i]();
       }
   }

   function run_at_end_of_this_or_next_physical_tick(fn) {
       function finalizer() {
           fn();
           tickFinalizers.splice(tickFinalizers.indexOf(finalizer), 1);
       }
       tickFinalizers.push(finalizer);
       ++numScheduledCalls;
       asap$1(function () {
           if (--numScheduledCalls === 0) finalizePhysicalTick();
       }, []);
   }

   function addPossiblyUnhandledError(promise) {
       // Only add to unhandledErrors if not already there. The first one to add to this list
       // will be upon the first rejection so that the root cause (first promise in the
       // rejection chain) is the one listed.
       if (!unhandledErrors.some(function (p) {
           return p._value === promise._value;
       })) unhandledErrors.push(promise);
   }

   function markErrorAsHandled(promise) {
       // Called when a reject handled is actually being called.
       // Search in unhandledErrors for any promise whos _value is this promise_value (list
       // contains only rejected promises, and only one item per error)
       var i = unhandledErrors.length;
       while (i) {
           if (unhandledErrors[--i]._value === promise._value) {
               // Found a promise that failed with this same error object pointer,
               // Remove that since there is a listener that actually takes care of it.
               unhandledErrors.splice(i, 1);
               return;
           }
       }
   }

   // By default, log uncaught errors to the console
   function defaultErrorHandler(e) {
       console.warn('Unhandled rejection: ' + (e.stack || e));
   }

   function PromiseReject(reason) {
       return new Promise(INTERNAL, false, reason);
   }

   function wrap(fn, errorCatcher) {
       var psd = PSD;
       return function () {
           var wasRootExec = beginMicroTickScope(),
               outerScope = PSD;

           try {
               if (outerScope !== psd) {
                   // **KEEP** outerScope.env = wrappers.snapshot(); // Snapshot outerScope's environment
                   PSD = psd;
                   // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
               }
               return fn.apply(this, arguments);
           } catch (e) {
               errorCatcher && errorCatcher(e);
           } finally {
               if (outerScope !== psd) {
                   PSD = outerScope;
                   // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment
               }
               if (wasRootExec) endMicroTickScope();
           }
       };
   }

   function newScope(fn, a1, a2, a3) {
       var parent = PSD,
           psd = Object.create(parent);
       psd.parent = parent;
       psd.ref = 0;
       psd.global = false;
       // **KEEP** psd.env = wrappers.wrap(psd);

       // unhandleds and onunhandled should not be specifically set here.
       // Leave them on parent prototype.
       // unhandleds.push(err) will push to parent's prototype
       // onunhandled() will call parents onunhandled (with this scope's this-pointer though!)
       ++parent.ref;
       psd.finalize = function () {
           --this.parent.ref || this.parent.finalize();
       };
       var rv = usePSD(psd, fn, a1, a2, a3);
       if (psd.ref === 0) psd.finalize();
       return rv;
   }

   function usePSD(psd, fn, a1, a2, a3) {
       var outerScope = PSD;
       try {
           if (psd !== outerScope) {
               // **KEEP** outerScope.env = wrappers.snapshot(); // snapshot outerScope's environment.
               PSD = psd;
               // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
           }
           return fn(a1, a2, a3);
       } finally {
           if (psd !== outerScope) {
               PSD = outerScope;
               // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment.
           }
       }
   }

   function globalError(err, promise) {
       var rv;
       try {
           rv = promise.onuncatched(err);
       } catch (e) {}
       if (rv !== false) try {
           Promise.on.error.fire(err, promise); // TODO: Deprecated and use same global handler as bluebird.
       } catch (e) {}
   }

   /* **KEEP** 

   export function wrapPromise(PromiseClass) {
       var proto = PromiseClass.prototype;
       var origThen = proto.then;
       
       wrappers.add({
           snapshot: () => proto.then,
           restore: value => {proto.then = value;},
           wrap: () => patchedThen
       });

       function patchedThen (onFulfilled, onRejected) {
           var promise = this;
           var onFulfilledProxy = wrap(function(value){
               var rv = value;
               if (onFulfilled) {
                   rv = onFulfilled(rv);
                   if (rv && typeof rv.then === 'function') rv.then(); // Intercept that promise as well.
               }
               --PSD.ref || PSD.finalize();
               return rv;
           });
           var onRejectedProxy = wrap(function(err){
               promise._$err = err;
               var unhandleds = PSD.unhandleds;
               var idx = unhandleds.length,
                   rv;
               while (idx--) if (unhandleds[idx]._$err === err) break;
               if (onRejected) {
                   if (idx !== -1) unhandleds.splice(idx, 1); // Mark as handled.
                   rv = onRejected(err);
                   if (rv && typeof rv.then === 'function') rv.then(); // Intercept that promise as well.
               } else {
                   if (idx === -1) unhandleds.push(promise);
                   rv = PromiseClass.reject(err);
                   rv._$nointercept = true; // Prohibit eternal loop.
               }
               --PSD.ref || PSD.finalize();
               return rv;
           });
           
           if (this._$nointercept) return origThen.apply(this, arguments);
           ++PSD.ref;
           return origThen.call(this, onFulfilledProxy, onRejectedProxy);
       }
   }

   // Global Promise wrapper
   if (_global.Promise) wrapPromise(_global.Promise);

   */

   doFakeAutoComplete(function () {
       // Simplify the job for VS Intellisense. This piece of code is one of the keys to the new marvellous intellisense support in Dexie.
       asap$1 = function (fn, args) {
           setTimeout(function () {
               fn.apply(null, args);
           }, 0);
       };
   });

   var DEXIE_VERSION = '1.4.1';
   var maxString = String.fromCharCode(65535);
   var maxKey = function () {
       try {
           IDBKeyRange.only([[]]);return [[]];
       } catch (e) {
           return maxString;
       }
   }();
   var INVALID_KEY_ARGUMENT = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";
   var STRING_EXPECTED = "String expected.";
   var connections = [];
   var isIEOrEdge = typeof navigator !== 'undefined' && /(MSIE|Trident|Edge)/.test(navigator.userAgent);
   var hasIEDeleteObjectStoreBug = isIEOrEdge;
   var hangsOnDeleteLargeKeyRange = isIEOrEdge;
   var dexieStackFrameFilter = function (frame) {
       return !/(dexie\.js|dexie\.min\.js)/.test(frame);
   };
   setDebug(debug, dexieStackFrameFilter);

   function Dexie(dbName, options) {
       /// <param name="options" type="Object" optional="true">Specify only if you wich to control which addons that should run on this instance</param>
       var deps = Dexie.dependencies;
       var opts = extend({
           // Default Options
           addons: Dexie.addons, // Pick statically registered addons by default
           autoOpen: true, // Don't require db.open() explicitely.
           indexedDB: deps.indexedDB, // Backend IndexedDB api. Default to IDBShim or browser env.
           IDBKeyRange: deps.IDBKeyRange // Backend IDBKeyRange api. Default to IDBShim or browser env.
       }, options);
       var addons = opts.addons,
           autoOpen = opts.autoOpen,
           indexedDB = opts.indexedDB,
           IDBKeyRange = opts.IDBKeyRange;

       var globalSchema = this._dbSchema = {};
       var versions = [];
       var dbStoreNames = [];
       var allTables = {};
       ///<var type="IDBDatabase" />
       var idbdb = null; // Instance of IDBDatabase
       var dbOpenError = null;
       var isBeingOpened = false;
       var openComplete = false;
       var READONLY = "readonly",
           READWRITE = "readwrite";
       var db = this;
       var dbReadyResolve,
           dbReadyPromise = new Promise(function (resolve) {
           dbReadyResolve = resolve;
       }),
           cancelOpen,
           openCanceller = new Promise(function (_, reject) {
           cancelOpen = reject;
       });
       var autoSchema = true;
       var hasNativeGetDatabaseNames = !!getNativeGetDatabaseNamesFn(indexedDB),
           hasGetAll;

       function init() {
           // Default subscribers to "versionchange" and "blocked".
           // Can be overridden by custom handlers. If custom handlers return false, these default
           // behaviours will be prevented.
           db.on("versionchange", function (ev) {
               // Default behavior for versionchange event is to close database connection.
               // Caller can override this behavior by doing db.on("versionchange", function(){ return false; });
               // Let's not block the other window from making it's delete() or open() call.
               // NOTE! This event is never fired in IE,Edge or Safari.
               if (ev.newVersion > 0) console.warn('Another connection wants to upgrade database \'' + db.name + '\'. Closing db now to resume the upgrade.');else console.warn('Another connection wants to delete database \'' + db.name + '\'. Closing db now to resume the delete request.');
               db.close();
               // In many web applications, it would be recommended to force window.reload()
               // when this event occurs. To do that, subscribe to the versionchange event
               // and call window.location.reload(true) if ev.newVersion > 0 (not a deletion)
               // The reason for this is that your current web app obviously has old schema code that needs
               // to be updated. Another window got a newer version of the app and needs to upgrade DB but
               // your window is blocking it unless we close it here.
           });
           db.on("blocked", function (ev) {
               if (!ev.newVersion || ev.newVersion < ev.oldVersion) console.warn('Dexie.delete(\'' + db.name + '\') was blocked');else console.warn('Upgrade \'' + db.name + '\' blocked by other connection holding version ' + ev.oldVersion / 10);
           });
       }

       //
       //
       //
       // ------------------------- Versioning Framework---------------------------
       //
       //
       //

       this.version = function (versionNumber) {
           /// <param name="versionNumber" type="Number"></param>
           /// <returns type="Version"></returns>
           if (idbdb || isBeingOpened) throw new exceptions.Schema("Cannot add version when database is open");
           this.verno = Math.max(this.verno, versionNumber);
           var versionInstance = versions.filter(function (v) {
               return v._cfg.version === versionNumber;
           })[0];
           if (versionInstance) return versionInstance;
           versionInstance = new Version(versionNumber);
           versions.push(versionInstance);
           versions.sort(lowerVersionFirst);
           return versionInstance;
       };

       function Version(versionNumber) {
           this._cfg = {
               version: versionNumber,
               storesSource: null,
               dbschema: {},
               tables: {},
               contentUpgrade: null
           };
           this.stores({}); // Derive earlier schemas by default.
       }

       extend(Version.prototype, {
           stores: function (stores) {
               /// <summary>
               ///   Defines the schema for a particular version
               /// </summary>
               /// <param name="stores" type="Object">
               /// Example: <br/>
               ///   {users: "id++,first,last,&amp;username,*email", <br/>
               ///   passwords: "id++,&amp;username"}<br/>
               /// <br/>
               /// Syntax: {Table: "[primaryKey][++],[&amp;][*]index1,[&amp;][*]index2,..."}<br/><br/>
               /// Special characters:<br/>
               ///  "&amp;"  means unique key, <br/>
               ///  "*"  means value is multiEntry, <br/>
               ///  "++" means auto-increment and only applicable for primary key <br/>
               /// </param>
               this._cfg.storesSource = this._cfg.storesSource ? extend(this._cfg.storesSource, stores) : stores;

               // Derive stores from earlier versions if they are not explicitely specified as null or a new syntax.
               var storesSpec = {};
               versions.forEach(function (version) {
                   // 'versions' is always sorted by lowest version first.
                   extend(storesSpec, version._cfg.storesSource);
               });

               var dbschema = this._cfg.dbschema = {};
               this._parseStoresSpec(storesSpec, dbschema);
               // Update the latest schema to this version
               // Update API
               globalSchema = db._dbSchema = dbschema;
               removeTablesApi([allTables, db, Transaction.prototype]);
               setApiOnPlace([allTables, db, Transaction.prototype, this._cfg.tables], keys(dbschema), READWRITE, dbschema);
               dbStoreNames = keys(dbschema);
               return this;
           },
           upgrade: function (upgradeFunction) {
               /// <param name="upgradeFunction" optional="true">Function that performs upgrading actions.</param>
               var self = this;
               fakeAutoComplete(function () {
                   upgradeFunction(db._createTransaction(READWRITE, keys(self._cfg.dbschema), self._cfg.dbschema)); // BUGBUG: No code completion for prev version's tables wont appear.
               });
               this._cfg.contentUpgrade = upgradeFunction;
               return this;
           },
           _parseStoresSpec: function (stores, outSchema) {
               keys(stores).forEach(function (tableName) {
                   if (stores[tableName] !== null) {
                       var instanceTemplate = {};
                       var indexes = parseIndexSyntax(stores[tableName]);
                       var primKey = indexes.shift();
                       if (primKey.multi) throw new exceptions.Schema("Primary key cannot be multi-valued");
                       if (primKey.keyPath) setByKeyPath(instanceTemplate, primKey.keyPath, primKey.auto ? 0 : primKey.keyPath);
                       indexes.forEach(function (idx) {
                           if (idx.auto) throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");
                           if (!idx.keyPath) throw new exceptions.Schema("Index must have a name and cannot be an empty string");
                           setByKeyPath(instanceTemplate, idx.keyPath, idx.compound ? idx.keyPath.map(function () {
                               return "";
                           }) : "");
                       });
                       outSchema[tableName] = new TableSchema(tableName, primKey, indexes, instanceTemplate);
                   }
               });
           }
       });

       function runUpgraders(oldVersion, idbtrans, reject) {
           var trans = db._createTransaction(READWRITE, dbStoreNames, globalSchema);
           trans.create(idbtrans);
           trans._completion.catch(reject);
           var rejectTransaction = trans._reject.bind(trans);
           newScope(function () {
               PSD.trans = trans;
               if (oldVersion === 0) {
                   // Create tables:
                   keys(globalSchema).forEach(function (tableName) {
                       createTable(idbtrans, tableName, globalSchema[tableName].primKey, globalSchema[tableName].indexes);
                   });
                   Promise.follow(function () {
                       return db.on.populate.fire(trans);
                   }).catch(rejectTransaction);
               } else updateTablesAndIndexes(oldVersion, trans, idbtrans).catch(rejectTransaction);
           });
       }

       function updateTablesAndIndexes(oldVersion, trans, idbtrans) {
           // Upgrade version to version, step-by-step from oldest to newest version.
           // Each transaction object will contain the table set that was current in that version (but also not-yet-deleted tables from its previous version)
           var queue = [];
           var oldVersionStruct = versions.filter(function (version) {
               return version._cfg.version === oldVersion;
           })[0];
           if (!oldVersionStruct) throw new exceptions.Upgrade("Dexie specification of currently installed DB version is missing");
           globalSchema = db._dbSchema = oldVersionStruct._cfg.dbschema;
           var anyContentUpgraderHasRun = false;

           var versToRun = versions.filter(function (v) {
               return v._cfg.version > oldVersion;
           });
           versToRun.forEach(function (version) {
               /// <param name="version" type="Version"></param>
               queue.push(function () {
                   var oldSchema = globalSchema;
                   var newSchema = version._cfg.dbschema;
                   adjustToExistingIndexNames(oldSchema, idbtrans);
                   adjustToExistingIndexNames(newSchema, idbtrans);
                   globalSchema = db._dbSchema = newSchema;
                   var diff = getSchemaDiff(oldSchema, newSchema);
                   // Add tables          
                   diff.add.forEach(function (tuple) {
                       createTable(idbtrans, tuple[0], tuple[1].primKey, tuple[1].indexes);
                   });
                   // Change tables
                   diff.change.forEach(function (change) {
                       if (change.recreate) {
                           throw new exceptions.Upgrade("Not yet support for changing primary key");
                       } else {
                           var store = idbtrans.objectStore(change.name);
                           // Add indexes
                           change.add.forEach(function (idx) {
                               addIndex(store, idx);
                           });
                           // Update indexes
                           change.change.forEach(function (idx) {
                               store.deleteIndex(idx.name);
                               addIndex(store, idx);
                           });
                           // Delete indexes
                           change.del.forEach(function (idxName) {
                               store.deleteIndex(idxName);
                           });
                       }
                   });
                   if (version._cfg.contentUpgrade) {
                       anyContentUpgraderHasRun = true;
                       return Promise.follow(function () {
                           version._cfg.contentUpgrade(trans);
                       });
                   }
               });
               queue.push(function (idbtrans) {
                   if (anyContentUpgraderHasRun && !hasIEDeleteObjectStoreBug) {
                       // Dont delete old tables if ieBug is present and a content upgrader has run. Let tables be left in DB so far. This needs to be taken care of.
                       var newSchema = version._cfg.dbschema;
                       // Delete old tables
                       deleteRemovedTables(newSchema, idbtrans);
                   }
               });
           });

           // Now, create a queue execution engine
           function runQueue() {
               return queue.length ? Promise.resolve(queue.shift()(trans.idbtrans)).then(runQueue) : Promise.resolve();
           }

           return runQueue().then(function () {
               createMissingTables(globalSchema, idbtrans); // At last, make sure to create any missing tables. (Needed by addons that add stores to DB without specifying version)
           });
       }

       function getSchemaDiff(oldSchema, newSchema) {
           var diff = {
               del: [], // Array of table names
               add: [], // Array of [tableName, newDefinition]
               change: [] // Array of {name: tableName, recreate: newDefinition, del: delIndexNames, add: newIndexDefs, change: changedIndexDefs}
           };
           for (var table in oldSchema) {
               if (!newSchema[table]) diff.del.push(table);
           }
           for (table in newSchema) {
               var oldDef = oldSchema[table],
                   newDef = newSchema[table];
               if (!oldDef) {
                   diff.add.push([table, newDef]);
               } else {
                   var change = {
                       name: table,
                       def: newDef,
                       recreate: false,
                       del: [],
                       add: [],
                       change: []
                   };
                   if (oldDef.primKey.src !== newDef.primKey.src) {
                       // Primary key has changed. Remove and re-add table.
                       change.recreate = true;
                       diff.change.push(change);
                   } else {
                       // Same primary key. Just find out what differs:
                       var oldIndexes = oldDef.idxByName;
                       var newIndexes = newDef.idxByName;
                       for (var idxName in oldIndexes) {
                           if (!newIndexes[idxName]) change.del.push(idxName);
                       }
                       for (idxName in newIndexes) {
                           var oldIdx = oldIndexes[idxName],
                               newIdx = newIndexes[idxName];
                           if (!oldIdx) change.add.push(newIdx);else if (oldIdx.src !== newIdx.src) change.change.push(newIdx);
                       }
                       if (change.del.length > 0 || change.add.length > 0 || change.change.length > 0) {
                           diff.change.push(change);
                       }
                   }
               }
           }
           return diff;
       }

       function createTable(idbtrans, tableName, primKey, indexes) {
           /// <param name="idbtrans" type="IDBTransaction"></param>
           var store = idbtrans.db.createObjectStore(tableName, primKey.keyPath ? { keyPath: primKey.keyPath, autoIncrement: primKey.auto } : { autoIncrement: primKey.auto });
           indexes.forEach(function (idx) {
               addIndex(store, idx);
           });
           return store;
       }

       function createMissingTables(newSchema, idbtrans) {
           keys(newSchema).forEach(function (tableName) {
               if (!idbtrans.db.objectStoreNames.contains(tableName)) {
                   createTable(idbtrans, tableName, newSchema[tableName].primKey, newSchema[tableName].indexes);
               }
           });
       }

       function deleteRemovedTables(newSchema, idbtrans) {
           for (var i = 0; i < idbtrans.db.objectStoreNames.length; ++i) {
               var storeName = idbtrans.db.objectStoreNames[i];
               if (newSchema[storeName] == null) {
                   idbtrans.db.deleteObjectStore(storeName);
               }
           }
       }

       function addIndex(store, idx) {
           store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multi });
       }

       function dbUncaught(err) {
           return db.on.error.fire(err);
       }

       //
       //
       //      Dexie Protected API
       //
       //

       this._allTables = allTables;

       this._tableFactory = function createTable(mode, tableSchema) {
           /// <param name="tableSchema" type="TableSchema"></param>
           if (mode === READONLY) return new Table(tableSchema.name, tableSchema, Collection);else return new WriteableTable(tableSchema.name, tableSchema);
       };

       this._createTransaction = function (mode, storeNames, dbschema, parentTransaction) {
           return new Transaction(mode, storeNames, dbschema, parentTransaction);
       };

       /* Generate a temporary transaction when db operations are done outside a transactino scope.
       */
       function tempTransaction(mode, storeNames, fn) {
           // Last argument is "writeLocked". But this doesnt apply to oneshot direct db operations, so we ignore it.
           if (!openComplete && !PSD.letThrough) {
               if (!isBeingOpened) {
                   if (!autoOpen) return rejection(new exceptions.DatabaseClosed(), dbUncaught);
                   db.open().catch(nop); // Open in background. If if fails, it will be catched by the final promise anyway.
               }
               return dbReadyPromise.then(function () {
                   return tempTransaction(mode, storeNames, fn);
               });
           } else {
               var trans = db._createTransaction(mode, storeNames, globalSchema);
               return trans._promise(mode, function (resolve, reject) {
                   newScope(function () {
                       // OPTIMIZATION POSSIBLE? newScope() not needed because it's already done in _promise.
                       PSD.trans = trans;
                       fn(resolve, reject, trans);
                   });
               }).then(function (result) {
                   // Instead of resolving value directly, wait with resolving it until transaction has completed.
                   // Otherwise the data would not be in the DB if requesting it in the then() operation.
                   // Specifically, to ensure that the following expression will work:
                   //
                   //   db.friends.put({name: "Arne"}).then(function () {
                   //       db.friends.where("name").equals("Arne").count(function(count) {
                   //           assert (count === 1);
                   //       });
                   //   });
                   //
                   return trans._completion.then(function () {
                       return result;
                   });
               }); /*.catch(err => { // Don't do this as of now. If would affect bulk- and modify methods in a way that could be more intuitive. But wait! Maybe change in next major.
                    trans._reject(err);
                    return rejection(err);
                   });*/
           }
       }

       this._whenReady = function (fn) {
           return new Promise(fake || openComplete || PSD.letThrough ? fn : function (resolve, reject) {
               if (!isBeingOpened) {
                   if (!autoOpen) {
                       reject(new exceptions.DatabaseClosed());
                       return;
                   }
                   db.open().catch(nop); // Open in background. If if fails, it will be catched by the final promise anyway.
               }
               dbReadyPromise.then(function () {
                   fn(resolve, reject);
               });
           }).uncaught(dbUncaught);
       };

       //
       //
       //
       //
       //      Dexie API
       //
       //
       //

       this.verno = 0;

       this.open = function () {
           if (isBeingOpened || idbdb) return dbReadyPromise.then(function () {
               return dbOpenError ? rejection(dbOpenError, dbUncaught) : db;
           });
           debug && (openCanceller._stackHolder = getErrorWithStack()); // Let stacks point to when open() was called rather than where new Dexie() was called.
           isBeingOpened = true;
           dbOpenError = null;
           openComplete = false;

           // Function pointers to call when the core opening process completes.
           var resolveDbReady = dbReadyResolve,

           // upgradeTransaction to abort on failure.
           upgradeTransaction = null;

           return Promise.race([openCanceller, new Promise(function (resolve, reject) {
               doFakeAutoComplete(function () {
                   return resolve();
               });

               // Make sure caller has specified at least one version
               if (versions.length > 0) autoSchema = false;

               // Multiply db.verno with 10 will be needed to workaround upgrading bug in IE:
               // IE fails when deleting objectStore after reading from it.
               // A future version of Dexie.js will stopover an intermediate version to workaround this.
               // At that point, we want to be backward compatible. Could have been multiplied with 2, but by using 10, it is easier to map the number to the real version number.

               // If no API, throw!
               if (!indexedDB) throw new exceptions.MissingAPI("indexedDB API not found. If using IE10+, make sure to run your code on a server URL " + "(not locally). If using old Safari versions, make sure to include indexedDB polyfill.");

               var req = autoSchema ? indexedDB.open(dbName) : indexedDB.open(dbName, Math.round(db.verno * 10));
               if (!req) throw new exceptions.MissingAPI("IndexedDB API not available"); // May happen in Safari private mode, see https://github.com/dfahlander/Dexie.js/issues/134
               req.onerror = wrap(eventRejectHandler(reject));
               req.onblocked = wrap(fireOnBlocked);
               req.onupgradeneeded = wrap(function (e) {
                   upgradeTransaction = req.transaction;
                   if (autoSchema && !db._allowEmptyDB) {
                       // Unless an addon has specified db._allowEmptyDB, lets make the call fail.
                       // Caller did not specify a version or schema. Doing that is only acceptable for opening alread existing databases.
                       // If onupgradeneeded is called it means database did not exist. Reject the open() promise and make sure that we
                       // do not create a new database by accident here.
                       req.onerror = preventDefault; // Prohibit onabort error from firing before we're done!
                       upgradeTransaction.abort(); // Abort transaction (would hope that this would make DB disappear but it doesnt.)
                       // Close database and delete it.
                       req.result.close();
                       var delreq = indexedDB.deleteDatabase(dbName); // The upgrade transaction is atomic, and javascript is single threaded - meaning that there is no risk that we delete someone elses database here!
                       delreq.onsuccess = delreq.onerror = wrap(function () {
                           reject(new exceptions.NoSuchDatabase('Database ' + dbName + ' doesnt exist'));
                       });
                   } else {
                       upgradeTransaction.onerror = wrap(eventRejectHandler(reject));
                       var oldVer = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion; // Safari 8 fix.
                       runUpgraders(oldVer / 10, upgradeTransaction, reject, req);
                   }
               }, reject);

               req.onsuccess = wrap(function () {
                   // Core opening procedure complete. Now let's just record some stuff.
                   upgradeTransaction = null;
                   idbdb = req.result;
                   connections.push(db); // Used for emulating versionchange event on IE/Edge/Safari.

                   if (autoSchema) readGlobalSchema();else if (idbdb.objectStoreNames.length > 0) {
                       try {
                           adjustToExistingIndexNames(globalSchema, idbdb.transaction(safariMultiStoreFix(idbdb.objectStoreNames), READONLY));
                       } catch (e) {
                           // Safari may bail out if > 1 store names. However, this shouldnt be a showstopper. Issue #120.
                       }
                   }

                   idbdb.onversionchange = wrap(function (ev) {
                       db._vcFired = true; // detect implementations that not support versionchange (IE/Edge/Safari)
                       db.on("versionchange").fire(ev);
                   });

                   if (!hasNativeGetDatabaseNames) {
                       // Update localStorage with list of database names
                       globalDatabaseList(function (databaseNames) {
                           if (databaseNames.indexOf(dbName) === -1) return databaseNames.push(dbName);
                       });
                   }

                   resolve();
               }, reject);
           })]).then(function () {
               // Before finally resolving the dbReadyPromise and this promise,
               // call and await all on('ready') subscribers:
               // Dexie.vip() makes subscribers able to use the database while being opened.
               // This is a must since these subscribers take part of the opening procedure.
               return Dexie.vip(db.on.ready.fire);
           }).then(function () {
               // Resolve the db.open() with the db instance.
               isBeingOpened = false;
               return db;
           }).catch(function (err) {
               try {
                   // Did we fail within onupgradeneeded? Make sure to abort the upgrade transaction so it doesnt commit.
                   upgradeTransaction && upgradeTransaction.abort();
               } catch (e) {}
               isBeingOpened = false; // Set before calling db.close() so that it doesnt reject openCanceller again (leads to unhandled rejection event).
               db.close(); // Closes and resets idbdb, removes connections, resets dbReadyPromise and openCanceller so that a later db.open() is fresh.
               // A call to db.close() may have made on-ready subscribers fail. Use dbOpenError if set, since err could be a follow-up error on that.
               dbOpenError = err; // Record the error. It will be used to reject further promises of db operations.
               return rejection(dbOpenError, dbUncaught); // dbUncaught will make sure any error that happened in any operation before will now bubble to db.on.error() thanks to the special handling in Promise.uncaught().
           }).finally(function () {
               openComplete = true;
               resolveDbReady(); // dbReadyPromise is resolved no matter if open() rejects or resolved. It's just to wake up waiters.
           });
       };

       this.close = function () {
           var idx = connections.indexOf(db);
           if (idx >= 0) connections.splice(idx, 1);
           if (idbdb) {
               try {
                   idbdb.close();
               } catch (e) {}
               idbdb = null;
           }
           autoOpen = false;
           dbOpenError = new exceptions.DatabaseClosed();
           if (isBeingOpened) cancelOpen(dbOpenError);
           // Reset dbReadyPromise promise:
           dbReadyPromise = new Promise(function (resolve) {
               dbReadyResolve = resolve;
           });
           openCanceller = new Promise(function (_, reject) {
               cancelOpen = reject;
           });
       };

       this.delete = function () {
           var hasArguments = arguments.length > 0;
           return new Promise(function (resolve, reject) {
               if (hasArguments) throw new exceptions.InvalidArgument("Arguments not allowed in db.delete()");
               if (isBeingOpened) {
                   dbReadyPromise.then(doDelete);
               } else {
                   doDelete();
               }
               function doDelete() {
                   db.close();
                   var req = indexedDB.deleteDatabase(dbName);
                   req.onsuccess = wrap(function () {
                       if (!hasNativeGetDatabaseNames) {
                           globalDatabaseList(function (databaseNames) {
                               var pos = databaseNames.indexOf(dbName);
                               if (pos >= 0) return databaseNames.splice(pos, 1);
                           });
                       }
                       resolve();
                   });
                   req.onerror = wrap(eventRejectHandler(reject));
                   req.onblocked = fireOnBlocked;
               }
           }).uncaught(dbUncaught);
       };

       this.backendDB = function () {
           return idbdb;
       };

       this.isOpen = function () {
           return idbdb !== null;
       };
       this.hasFailed = function () {
           return dbOpenError !== null;
       };
       this.dynamicallyOpened = function () {
           return autoSchema;
       };

       //
       // Properties
       //
       this.name = dbName;

       // db.tables - an array of all Table instances.
       setProp(this, "tables", {
           get: function () {
               /// <returns type="Array" elementType="WriteableTable" />
               return keys(allTables).map(function (name) {
                   return allTables[name];
               });
           }
       });

       //
       // Events
       //
       this.on = Events(this, "error", "populate", "blocked", "versionchange", { ready: [promisableChain, nop] });

       this.on.ready.subscribe = override(this.on.ready.subscribe, function (subscribe) {
           return function (subscriber, bSticky) {
               Dexie.vip(function () {
                   subscribe(subscriber);
                   if (!bSticky) subscribe(function unsubscribe() {
                       db.on.ready.unsubscribe(subscriber);
                       db.on.ready.unsubscribe(unsubscribe);
                   });
               });
           };
       });

       fakeAutoComplete(function () {
           db.on("populate").fire(db._createTransaction(READWRITE, dbStoreNames, globalSchema));
           db.on("error").fire(new Error());
       });

       this.transaction = function (mode, tableInstances, scopeFunc) {
           /// <summary>
           ///
           /// </summary>
           /// <param name="mode" type="String">"r" for readonly, or "rw" for readwrite</param>
           /// <param name="tableInstances">Table instance, Array of Table instances, String or String Array of object stores to include in the transaction</param>
           /// <param name="scopeFunc" type="Function">Function to execute with transaction</param>

           // Let table arguments be all arguments between mode and last argument.
           var i = arguments.length;
           if (i < 2) throw new exceptions.InvalidArgument("Too few arguments");
           // Prevent optimzation killer (https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments)
           // and clone arguments except the first one into local var 'args'.
           var args = new Array(i - 1);
           while (--i) {
               args[i - 1] = arguments[i];
           } // Let scopeFunc be the last argument and pop it so that args now only contain the table arguments.
           scopeFunc = args.pop();
           var tables = flatten(args); // Support using array as middle argument, or a mix of arrays and non-arrays.
           var parentTransaction = PSD.trans;
           // Check if parent transactions is bound to this db instance, and if caller wants to reuse it
           if (!parentTransaction || parentTransaction.db !== db || mode.indexOf('!') !== -1) parentTransaction = null;
           var onlyIfCompatible = mode.indexOf('?') !== -1;
           mode = mode.replace('!', '').replace('?', ''); // Ok. Will change arguments[0] as well but we wont touch arguments henceforth.

           try {
               //
               // Get storeNames from arguments. Either through given table instances, or through given table names.
               //
               var storeNames = tables.map(function (table) {
                   var storeName = table instanceof Table ? table.name : table;
                   if (typeof storeName !== 'string') throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
                   return storeName;
               });

               //
               // Resolve mode. Allow shortcuts "r" and "rw".
               //
               if (mode == "r" || mode == READONLY) mode = READONLY;else if (mode == "rw" || mode == READWRITE) mode = READWRITE;else throw new exceptions.InvalidArgument("Invalid transaction mode: " + mode);

               if (parentTransaction) {
                   // Basic checks
                   if (parentTransaction.mode === READONLY && mode === READWRITE) {
                       if (onlyIfCompatible) {
                           // Spawn new transaction instead.
                           parentTransaction = null;
                       } else throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
                   }
                   if (parentTransaction) {
                       storeNames.forEach(function (storeName) {
                           if (!hasOwn(parentTransaction.tables, storeName)) {
                               if (onlyIfCompatible) {
                                   // Spawn new transaction instead.
                                   parentTransaction = null;
                               } else throw new exceptions.SubTransaction("Table " + storeName + " not included in parent transaction.");
                           }
                       });
                   }
               }
           } catch (e) {
               return parentTransaction ? parentTransaction._promise(null, function (_, reject) {
                   reject(e);
               }) : rejection(e, dbUncaught);
           }
           // If this is a sub-transaction, lock the parent and then launch the sub-transaction.
           return parentTransaction ? parentTransaction._promise(mode, enterTransactionScope, "lock") : db._whenReady(enterTransactionScope);

           function enterTransactionScope(resolve) {
               var parentPSD = PSD;
               resolve(Promise.resolve().then(function () {
                   return newScope(function () {
                       // Keep a pointer to last non-transactional PSD to use if someone calls Dexie.ignoreTransaction().
                       PSD.transless = PSD.transless || parentPSD;
                       // Our transaction.
                       //return new Promise((resolve, reject) => {
                       var trans = db._createTransaction(mode, storeNames, globalSchema, parentTransaction);
                       // Let the transaction instance be part of a Promise-specific data (PSD) value.
                       PSD.trans = trans;

                       if (parentTransaction) {
                           // Emulate transaction commit awareness for inner transaction (must 'commit' when the inner transaction has no more operations ongoing)
                           trans.idbtrans = parentTransaction.idbtrans;
                       } else {
                           trans.create(); // Create the backend transaction so that complete() or error() will trigger even if no operation is made upon it.
                       }

                       // Provide arguments to the scope function (for backward compatibility)
                       var tableArgs = storeNames.map(function (name) {
                           return trans.tables[name];
                       });
                       tableArgs.push(trans);

                       var returnValue;
                       return Promise.follow(function () {
                           // Finally, call the scope function with our table and transaction arguments.
                           returnValue = scopeFunc.apply(trans, tableArgs); // NOTE: returnValue is used in trans.on.complete() not as a returnValue to this func.
                           if (returnValue) {
                               if (typeof returnValue.next === 'function' && typeof returnValue.throw === 'function') {
                                   // scopeFunc returned an iterator with throw-support. Handle yield as await.
                                   returnValue = awaitIterator(returnValue);
                               } else if (typeof returnValue.then === 'function' && !hasOwn(returnValue, '_PSD')) {
                                   throw new exceptions.IncompatiblePromise("Incompatible Promise returned from transaction scope (read more at http://tinyurl.com/znyqjqc). Transaction scope: " + scopeFunc.toString());
                               }
                           }
                       }).uncaught(dbUncaught).then(function () {
                           if (parentTransaction) trans._resolve(); // sub transactions don't react to idbtrans.oncomplete. We must trigger a acompletion.
                           return trans._completion; // Even if WE believe everything is fine. Await IDBTransaction's oncomplete or onerror as well.
                       }).then(function () {
                           return returnValue;
                       }).catch(function (e) {
                           //reject(e);
                           trans._reject(e); // Yes, above then-handler were maybe not called because of an unhandled rejection in scopeFunc!
                           return rejection(e);
                       });
                       //});
                   });
               }));
           }
       };

       this.table = function (tableName) {
           /// <returns type="WriteableTable"></returns>
           if (fake && autoSchema) return new WriteableTable(tableName);
           if (!hasOwn(allTables, tableName)) {
               throw new exceptions.InvalidTable('Table ' + tableName + ' does not exist');
           }
           return allTables[tableName];
       };

       //
       //
       //
       // Table Class
       //
       //
       //
       function Table(name, tableSchema, collClass) {
           /// <param name="name" type="String"></param>
           this.name = name;
           this.schema = tableSchema;
           this.hook = allTables[name] ? allTables[name].hook : Events(null, {
               "creating": [hookCreatingChain, nop],
               "reading": [pureFunctionChain, mirror],
               "updating": [hookUpdatingChain, nop],
               "deleting": [hookDeletingChain, nop]
           });
           this._collClass = collClass || Collection;
       }

       props(Table.prototype, {

           //
           // Table Protected Methods
           //

           _trans: function getTransaction(mode, fn, writeLocked) {
               var trans = PSD.trans;
               return trans && trans.db === db ? trans._promise(mode, fn, writeLocked) : tempTransaction(mode, [this.name], fn);
           },
           _idbstore: function getIDBObjectStore(mode, fn, writeLocked) {
               if (fake) return new Promise(fn); // Simplify the work for Intellisense/Code completion.
               var trans = PSD.trans,
                   tableName = this.name;
               function supplyIdbStore(resolve, reject, trans) {
                   fn(resolve, reject, trans.idbtrans.objectStore(tableName), trans);
               }
               return trans && trans.db === db ? trans._promise(mode, supplyIdbStore, writeLocked) : tempTransaction(mode, [this.name], supplyIdbStore);
           },

           //
           // Table Public Methods
           //
           get: function (key, cb) {
               var self = this;
               return this._idbstore(READONLY, function (resolve, reject, idbstore) {
                   fake && resolve(self.schema.instanceTemplate);
                   var req = idbstore.get(key);
                   req.onerror = eventRejectHandler(reject);
                   req.onsuccess = function () {
                       resolve(self.hook.reading.fire(req.result));
                   };
               }).then(cb);
           },
           where: function (indexName) {
               return new WhereClause(this, indexName);
           },
           count: function (cb) {
               return this.toCollection().count(cb);
           },
           offset: function (offset) {
               return this.toCollection().offset(offset);
           },
           limit: function (numRows) {
               return this.toCollection().limit(numRows);
           },
           reverse: function () {
               return this.toCollection().reverse();
           },
           filter: function (filterFunction) {
               return this.toCollection().and(filterFunction);
           },
           each: function (fn) {
               return this.toCollection().each(fn);
           },
           toArray: function (cb) {
               return this.toCollection().toArray(cb);
           },
           orderBy: function (index) {
               return new this._collClass(new WhereClause(this, index));
           },

           toCollection: function () {
               return new this._collClass(new WhereClause(this));
           },

           mapToClass: function (constructor, structure) {
               /// <summary>
               ///     Map table to a javascript constructor function. Objects returned from the database will be instances of this class, making
               ///     it possible to the instanceOf operator as well as extending the class using constructor.prototype.method = function(){...}.
               /// </summary>
               /// <param name="constructor">Constructor function representing the class.</param>
               /// <param name="structure" optional="true">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
               /// know what type each member has. Example: {name: String, emailAddresses: [String], password}</param>
               this.schema.mappedClass = constructor;
               var instanceTemplate = Object.create(constructor.prototype);
               if (structure) {
                   // structure and instanceTemplate is for IDE code competion only while constructor.prototype is for actual inheritance.
                   applyStructure(instanceTemplate, structure);
               }
               this.schema.instanceTemplate = instanceTemplate;

               // Now, subscribe to the when("reading") event to make all objects that come out from this table inherit from given class
               // no matter which method to use for reading (Table.get() or Table.where(...)... )
               var readHook = function (obj) {
                   if (!obj) return obj; // No valid object. (Value is null). Return as is.
                   // Create a new object that derives from constructor:
                   var res = Object.create(constructor.prototype);
                   // Clone members:
                   for (var m in obj) {
                       if (hasOwn(obj, m)) res[m] = obj[m];
                   }return res;
               };

               if (this.schema.readHook) {
                   this.hook.reading.unsubscribe(this.schema.readHook);
               }
               this.schema.readHook = readHook;
               this.hook("reading", readHook);
               return constructor;
           },
           defineClass: function (structure) {
               /// <summary>
               ///     Define all members of the class that represents the table. This will help code completion of when objects are read from the database
               ///     as well as making it possible to extend the prototype of the returned constructor function.
               /// </summary>
               /// <param name="structure">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
               /// know what type each member has. Example: {name: String, emailAddresses: [String], properties: {shoeSize: Number}}</param>
               return this.mapToClass(Dexie.defineClass(structure), structure);
           }
       });

       //
       //
       //
       // WriteableTable Class (extends Table)
       //
       //
       //
       function WriteableTable(name, tableSchema, collClass) {
           Table.call(this, name, tableSchema, collClass || WriteableCollection);
       }

       function BulkErrorHandlerCatchAll(errorList, done, supportHooks) {
           return (supportHooks ? hookedEventRejectHandler : eventRejectHandler)(function (e) {
               errorList.push(e);
               done && done();
           });
       }

       function bulkDelete(idbstore, trans, keysOrTuples, hasDeleteHook, deletingHook) {
           // If hasDeleteHook, keysOrTuples must be an array of tuples: [[key1, value2],[key2,value2],...],
           // else keysOrTuples must be just an array of keys: [key1, key2, ...].
           return new Promise(function (resolve, reject) {
               var len = keysOrTuples.length,
                   lastItem = len - 1;
               if (len === 0) return resolve();
               if (!hasDeleteHook) {
                   for (var i = 0; i < len; ++i) {
                       var req = idbstore.delete(keysOrTuples[i]);
                       req.onerror = wrap(eventRejectHandler(reject));
                       if (i === lastItem) req.onsuccess = wrap(function () {
                           return resolve();
                       });
                   }
               } else {
                   var hookCtx,
                       errorHandler = hookedEventRejectHandler(reject),
                       successHandler = hookedEventSuccessHandler(null);
                   tryCatch(function () {
                       for (var i = 0; i < len; ++i) {
                           hookCtx = { onsuccess: null, onerror: null };
                           var tuple = keysOrTuples[i];
                           deletingHook.call(hookCtx, tuple[0], tuple[1], trans);
                           var req = idbstore.delete(tuple[0]);
                           req._hookCtx = hookCtx;
                           req.onerror = errorHandler;
                           if (i === lastItem) req.onsuccess = hookedEventSuccessHandler(resolve);else req.onsuccess = successHandler;
                       }
                   }, function (err) {
                       hookCtx.onerror && hookCtx.onerror(err);
                       throw err;
                   });
               }
           }).uncaught(dbUncaught);
       }

       derive(WriteableTable).from(Table).extend({
           bulkDelete: function (keys) {
               if (this.hook.deleting.fire === nop) {
                   return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                       resolve(bulkDelete(idbstore, trans, keys, false, nop));
                   });
               } else {
                   return this.where(':id').anyOf(keys).delete().then(function () {}); // Resolve with undefined.
               }
           },
           bulkPut: function (objects, keys) {
               var _this = this;

               return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                   if (!idbstore.keyPath && !_this.schema.primKey.auto && !keys) throw new exceptions.InvalidArgument("bulkPut() with non-inbound keys requires keys array in second argument");
                   if (idbstore.keyPath && keys) throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
                   if (keys && keys.length !== objects.length) throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                   if (objects.length === 0) return resolve(); // Caller provided empty list.
                   var done = function (result) {
                       if (errorList.length === 0) resolve(result);else reject(new BulkError(_this.name + '.bulkPut(): ' + errorList.length + ' of ' + numObjs + ' operations failed', errorList));
                   };
                   var req,
                       errorList = [],
                       errorHandler,
                       numObjs = objects.length,
                       table = _this;
                   if (_this.hook.creating.fire === nop && _this.hook.updating.fire === nop) {
                       //
                       // Standard Bulk (no 'creating' or 'updating' hooks to care about)
                       //
                       errorHandler = BulkErrorHandlerCatchAll(errorList);
                       for (var i = 0, l = objects.length; i < l; ++i) {
                           req = keys ? idbstore.put(objects[i], keys[i]) : idbstore.put(objects[i]);
                           req.onerror = errorHandler;
                       }
                       // Only need to catch success or error on the last operation
                       // according to the IDB spec.
                       req.onerror = BulkErrorHandlerCatchAll(errorList, done);
                       req.onsuccess = eventSuccessHandler(done);
                   } else {
                       var effectiveKeys = keys || idbstore.keyPath && objects.map(function (o) {
                           return getByKeyPath(o, idbstore.keyPath);
                       });
                       // Generate map of {[key]: object}
                       var objectLookup = effectiveKeys && arrayToObject(effectiveKeys, function (key, i) {
                           return key != null && [key, objects[i]];
                       });
                       var promise = !effectiveKeys ?

                       // Auto-incremented key-less objects only without any keys argument.
                       table.bulkAdd(objects) :

                       // Keys provided. Either as inbound in provided objects, or as a keys argument.
                       // Begin with updating those that exists in DB:
                       table.where(':id').anyOf(effectiveKeys.filter(function (key) {
                           return key != null;
                       })).modify(function () {
                           this.value = objectLookup[this.primKey];
                           objectLookup[this.primKey] = null; // Mark as "don't add this"
                       }).catch(ModifyError, function (e) {
                           errorList = e.failures; // No need to concat here. These are the first errors added.
                       }).then(function () {
                           // Now, let's examine which items didnt exist so we can add them:
                           var objsToAdd = [],
                               keysToAdd = keys && [];
                           // Iterate backwards. Why? Because if same key was used twice, just add the last one.
                           for (var i = effectiveKeys.length - 1; i >= 0; --i) {
                               var key = effectiveKeys[i];
                               if (key == null || objectLookup[key]) {
                                   objsToAdd.push(objects[i]);
                                   keys && keysToAdd.push(key);
                                   if (key != null) objectLookup[key] = null; // Mark as "dont add again"
                               }
                           }
                           // The items are in reverse order so reverse them before adding.
                           // Could be important in order to get auto-incremented keys the way the caller
                           // would expect. Could have used unshift instead of push()/reverse(),
                           // but: http://jsperf.com/unshift-vs-reverse
                           objsToAdd.reverse();
                           keys && keysToAdd.reverse();
                           return table.bulkAdd(objsToAdd, keysToAdd);
                       }).then(function (lastAddedKey) {
                           // Resolve with key of the last object in given arguments to bulkPut():
                           var lastEffectiveKey = effectiveKeys[effectiveKeys.length - 1]; // Key was provided.
                           return lastEffectiveKey != null ? lastEffectiveKey : lastAddedKey;
                       });

                       promise.then(done).catch(BulkError, function (e) {
                           // Concat failure from ModifyError and reject using our 'done' method.
                           errorList = errorList.concat(e.failures);
                           done();
                       }).catch(reject);
                   }
               }, "locked"); // If called from transaction scope, lock transaction til all steps are done.
           },
           bulkAdd: function (objects, keys) {
               var self = this,
                   creatingHook = this.hook.creating.fire;
               return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                   if (!idbstore.keyPath && !self.schema.primKey.auto && !keys) throw new exceptions.InvalidArgument("bulkAdd() with non-inbound keys requires keys array in second argument");
                   if (idbstore.keyPath && keys) throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
                   if (keys && keys.length !== objects.length) throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                   if (objects.length === 0) return resolve(); // Caller provided empty list.
                   function done(result) {
                       if (errorList.length === 0) resolve(result);else reject(new BulkError(self.name + '.bulkAdd(): ' + errorList.length + ' of ' + numObjs + ' operations failed', errorList));
                   }
                   var req,
                       errorList = [],
                       errorHandler,
                       successHandler,
                       numObjs = objects.length;
                   if (creatingHook !== nop) {
                       //
                       // There are subscribers to hook('creating')
                       // Must behave as documented.
                       //
                       var keyPath = idbstore.keyPath,
                           hookCtx;
                       errorHandler = BulkErrorHandlerCatchAll(errorList, null, true);
                       successHandler = hookedEventSuccessHandler(null);

                       tryCatch(function () {
                           for (var i = 0, l = objects.length; i < l; ++i) {
                               hookCtx = { onerror: null, onsuccess: null };
                               var key = keys && keys[i];
                               var obj = objects[i],
                                   effectiveKey = keys ? key : keyPath ? getByKeyPath(obj, keyPath) : undefined,
                                   keyToUse = creatingHook.call(hookCtx, effectiveKey, obj, trans);
                               if (effectiveKey == null && keyToUse != null) {
                                   if (keyPath) {
                                       obj = deepClone(obj);
                                       setByKeyPath(obj, keyPath, keyToUse);
                                   } else {
                                       key = keyToUse;
                                   }
                               }
                               req = key != null ? idbstore.add(obj, key) : idbstore.add(obj);
                               req._hookCtx = hookCtx;
                               if (i < l - 1) {
                                   req.onerror = errorHandler;
                                   if (hookCtx.onsuccess) req.onsuccess = successHandler;
                               }
                           }
                       }, function (err) {
                           hookCtx.onerror && hookCtx.onerror(err);
                           throw err;
                       });

                       req.onerror = BulkErrorHandlerCatchAll(errorList, done, true);
                       req.onsuccess = hookedEventSuccessHandler(done);
                   } else {
                       //
                       // Standard Bulk (no 'creating' hook to care about)
                       //
                       errorHandler = BulkErrorHandlerCatchAll(errorList);
                       for (var i = 0, l = objects.length; i < l; ++i) {
                           req = keys ? idbstore.add(objects[i], keys[i]) : idbstore.add(objects[i]);
                           req.onerror = errorHandler;
                       }
                       // Only need to catch success or error on the last operation
                       // according to the IDB spec.
                       req.onerror = BulkErrorHandlerCatchAll(errorList, done);
                       req.onsuccess = eventSuccessHandler(done);
                   }
               });
           },
           add: function (obj, key) {
               /// <summary>
               ///   Add an object to the database. In case an object with same primary key already exists, the object will not be added.
               /// </summary>
               /// <param name="obj" type="Object">A javascript object to insert</param>
               /// <param name="key" optional="true">Primary key</param>
               var creatingHook = this.hook.creating.fire;
               return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                   var hookCtx = { onsuccess: null, onerror: null };
                   if (creatingHook !== nop) {
                       var effectiveKey = key != null ? key : idbstore.keyPath ? getByKeyPath(obj, idbstore.keyPath) : undefined;
                       var keyToUse = creatingHook.call(hookCtx, effectiveKey, obj, trans); // Allow subscribers to when("creating") to generate the key.
                       if (effectiveKey == null && keyToUse != null) {
                           // Using "==" and "!=" to check for either null or undefined!
                           if (idbstore.keyPath) setByKeyPath(obj, idbstore.keyPath, keyToUse);else key = keyToUse;
                       }
                   }
                   try {
                       var req = key != null ? idbstore.add(obj, key) : idbstore.add(obj);
                       req._hookCtx = hookCtx;
                       req.onerror = hookedEventRejectHandler(reject);
                       req.onsuccess = hookedEventSuccessHandler(function (result) {
                           // TODO: Remove these two lines in next major release (2.0?)
                           // It's no good practice to have side effects on provided parameters
                           var keyPath = idbstore.keyPath;
                           if (keyPath) setByKeyPath(obj, keyPath, result);
                           resolve(result);
                       });
                   } catch (e) {
                       if (hookCtx.onerror) hookCtx.onerror(e);
                       throw e;
                   }
               });
           },

           put: function (obj, key) {
               /// <summary>
               ///   Add an object to the database but in case an object with same primary key alread exists, the existing one will get updated.
               /// </summary>
               /// <param name="obj" type="Object">A javascript object to insert or update</param>
               /// <param name="key" optional="true">Primary key</param>
               var self = this,
                   creatingHook = this.hook.creating.fire,
                   updatingHook = this.hook.updating.fire;
               if (creatingHook !== nop || updatingHook !== nop) {
                   //
                   // People listens to when("creating") or when("updating") events!
                   // We must know whether the put operation results in an CREATE or UPDATE.
                   //
                   return this._trans(READWRITE, function (resolve, reject, trans) {
                       // Since key is optional, make sure we get it from obj if not provided
                       var effectiveKey = key !== undefined ? key : self.schema.primKey.keyPath && getByKeyPath(obj, self.schema.primKey.keyPath);
                       if (effectiveKey == null) {
                           // "== null" means checking for either null or undefined.
                           // No primary key. Must use add().
                           trans.tables[self.name].add(obj).then(resolve, reject);
                       } else {
                           // Primary key exist. Lock transaction and try modifying existing. If nothing modified, call add().
                           trans._lock(); // Needed because operation is splitted into modify() and add().
                           // clone obj before this async call. If caller modifies obj the line after put(), the IDB spec requires that it should not affect operation.
                           obj = deepClone(obj);
                           trans.tables[self.name].where(":id").equals(effectiveKey).modify(function () {
                               // Replace extisting value with our object
                               // CRUD event firing handled in WriteableCollection.modify()
                               this.value = obj;
                           }).then(function (count) {
                               if (count === 0) {
                                   // Object's key was not found. Add the object instead.
                                   // CRUD event firing will be done in add()
                                   return trans.tables[self.name].add(obj, key); // Resolving with another Promise. Returned Promise will then resolve with the new key.
                               } else {
                                       return effectiveKey; // Resolve with the provided key.
                                   }
                           }).finally(function () {
                               trans._unlock();
                           }).then(resolve, reject);
                       }
                   });
               } else {
                   // Use the standard IDB put() method.
                   return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                       var req = key !== undefined ? idbstore.put(obj, key) : idbstore.put(obj);
                       req.onerror = eventRejectHandler(reject);
                       req.onsuccess = function (ev) {
                           var keyPath = idbstore.keyPath;
                           if (keyPath) setByKeyPath(obj, keyPath, ev.target.result);
                           resolve(req.result);
                       };
                   });
               }
           },

           'delete': function (key) {
               /// <param name="key">Primary key of the object to delete</param>
               if (this.hook.deleting.subscribers.length) {
                   // People listens to when("deleting") event. Must implement delete using WriteableCollection.delete() that will
                   // call the CRUD event. Only WriteableCollection.delete() will know whether an object was actually deleted.
                   return this.where(":id").equals(key).delete();
               } else {
                   // No one listens. Use standard IDB delete() method.
                   return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                       var req = idbstore.delete(key);
                       req.onerror = eventRejectHandler(reject);
                       req.onsuccess = function () {
                           resolve(req.result);
                       };
                   });
               }
           },

           clear: function () {
               if (this.hook.deleting.subscribers.length) {
                   // People listens to when("deleting") event. Must implement delete using WriteableCollection.delete() that will
                   // call the CRUD event. Only WriteableCollection.delete() will knows which objects that are actually deleted.
                   return this.toCollection().delete();
               } else {
                   return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                       var req = idbstore.clear();
                       req.onerror = eventRejectHandler(reject);
                       req.onsuccess = function () {
                           resolve(req.result);
                       };
                   });
               }
           },

           update: function (keyOrObject, modifications) {
               if (typeof modifications !== 'object' || isArray(modifications)) throw new exceptions.InvalidArgument("Modifications must be an object.");
               if (typeof keyOrObject === 'object' && !isArray(keyOrObject)) {
                   // object to modify. Also modify given object with the modifications:
                   keys(modifications).forEach(function (keyPath) {
                       setByKeyPath(keyOrObject, keyPath, modifications[keyPath]);
                   });
                   var key = getByKeyPath(keyOrObject, this.schema.primKey.keyPath);
                   if (key === undefined) return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"), dbUncaught);
                   return this.where(":id").equals(key).modify(modifications);
               } else {
                   // key to modify
                   return this.where(":id").equals(keyOrObject).modify(modifications);
               }
           }
       });

       //
       //
       //
       // Transaction Class
       //
       //
       //
       function Transaction(mode, storeNames, dbschema, parent) {
           var _this2 = this;

           /// <summary>
           ///    Transaction class. Represents a database transaction. All operations on db goes through a Transaction.
           /// </summary>
           /// <param name="mode" type="String">Any of "readwrite" or "readonly"</param>
           /// <param name="storeNames" type="Array">Array of table names to operate on</param>
           this.db = db;
           this.mode = mode;
           this.storeNames = storeNames;
           this.idbtrans = null;
           this.on = Events(this, "complete", "error", "abort");
           this.parent = parent || null;
           this.active = true;
           this._tables = null;
           this._reculock = 0;
           this._blockedFuncs = [];
           this._psd = null;
           this._dbschema = dbschema;
           this._resolve = null;
           this._reject = null;
           this._completion = new Promise(function (resolve, reject) {
               _this2._resolve = resolve;
               _this2._reject = reject;
           }).uncaught(dbUncaught);

           this._completion.then(function () {
               _this2.on.complete.fire();
           }, function (e) {
               _this2.on.error.fire(e);
               _this2.parent ? _this2.parent._reject(e) : _this2.active && _this2.idbtrans && _this2.idbtrans.abort();
               _this2.active = false;
               return rejection(e); // Indicate we actually DO NOT catch this error.
           });
       }

       props(Transaction.prototype, {
           //
           // Transaction Protected Methods (not required by API users, but needed internally and eventually by dexie extensions)
           //
           _lock: function () {
               assert(!PSD.global); // Locking and unlocking reuires to be within a PSD scope.
               // Temporary set all requests into a pending queue if they are called before database is ready.
               ++this._reculock; // Recursive read/write lock pattern using PSD (Promise Specific Data) instead of TLS (Thread Local Storage)
               if (this._reculock === 1 && !PSD.global) PSD.lockOwnerFor = this;
               return this;
           },
           _unlock: function () {
               assert(!PSD.global); // Locking and unlocking reuires to be within a PSD scope.
               if (--this._reculock === 0) {
                   if (!PSD.global) PSD.lockOwnerFor = null;
                   while (this._blockedFuncs.length > 0 && !this._locked()) {
                       var fn = this._blockedFuncs.shift();
                       try {
                           fn();
                       } catch (e) {}
                   }
               }
               return this;
           },
           _locked: function () {
               // Checks if any write-lock is applied on this transaction.
               // To simplify the Dexie API for extension implementations, we support recursive locks.
               // This is accomplished by using "Promise Specific Data" (PSD).
               // PSD data is bound to a Promise and any child Promise emitted through then() or resolve( new Promise() ).
               // PSD is local to code executing on top of the call stacks of any of any code executed by Promise():
               //         * callback given to the Promise() constructor  (function (resolve, reject){...})
               //         * callbacks given to then()/catch()/finally() methods (function (value){...})
               // If creating a new independant Promise instance from within a Promise call stack, the new Promise will derive the PSD from the call stack of the parent Promise.
               // Derivation is done so that the inner PSD __proto__ points to the outer PSD.
               // PSD.lockOwnerFor will point to current transaction object if the currently executing PSD scope owns the lock.
               return this._reculock && PSD.lockOwnerFor !== this;
           },
           create: function (idbtrans) {
               var _this3 = this;

               assert(!this.idbtrans);
               if (!idbtrans && !idbdb) {
                   switch (dbOpenError && dbOpenError.name) {
                       case "DatabaseClosedError":
                           // Errors where it is no difference whether it was caused by the user operation or an earlier call to db.open()
                           throw new exceptions.DatabaseClosed(dbOpenError);
                       case "MissingAPIError":
                           // Errors where it is no difference whether it was caused by the user operation or an earlier call to db.open()
                           throw new exceptions.MissingAPI(dbOpenError.message, dbOpenError);
                       default:
                           // Make it clear that the user operation was not what caused the error - the error had occurred earlier on db.open()!
                           throw new exceptions.OpenFailed(dbOpenError);
                   }
               }
               if (!this.active) throw new exceptions.TransactionInactive();
               assert(this._completion._state === null);

               idbtrans = this.idbtrans = idbtrans || idbdb.transaction(safariMultiStoreFix(this.storeNames), this.mode);
               idbtrans.onerror = wrap(function (ev) {
                   preventDefault(ev); // Prohibit default bubbling to window.error
                   _this3._reject(idbtrans.error);
               });
               idbtrans.onabort = wrap(function (ev) {
                   preventDefault(ev);
                   _this3.active && _this3._reject(new exceptions.Abort());
                   _this3.active = false;
                   _this3.on("abort").fire(ev);
               });
               idbtrans.oncomplete = wrap(function () {
                   _this3.active = false;
                   _this3._resolve();
               });
               return this;
           },
           _promise: function (mode, fn, bWriteLock) {
               var self = this;
               return newScope(function () {
                   var p;
                   // Read lock always
                   if (!self._locked()) {
                       p = self.active ? new Promise(function (resolve, reject) {
                           if (mode === READWRITE && self.mode !== READWRITE) throw new exceptions.ReadOnly("Transaction is readonly");
                           if (!self.idbtrans && mode) self.create();
                           if (bWriteLock) self._lock(); // Write lock if write operation is requested
                           fn(resolve, reject, self);
                       }) : rejection(new exceptions.TransactionInactive());
                       if (self.active && bWriteLock) p.finally(function () {
                           self._unlock();
                       });
                   } else {
                       // Transaction is write-locked. Wait for mutex.
                       p = new Promise(function (resolve, reject) {
                           self._blockedFuncs.push(function () {
                               self._promise(mode, fn, bWriteLock).then(resolve, reject);
                           });
                       });
                   }
                   p._lib = true;
                   return p.uncaught(dbUncaught);
               });
           },

           //
           // Transaction Public Properties and Methods
           //
           abort: function () {
               this.active && this._reject(new exceptions.Abort());
               this.active = false;
           },

           // Deprecate:
           tables: {
               get: function () {
                   if (this._tables) return this._tables;
                   return this._tables = arrayToObject(this.storeNames, function (name) {
                       return [name, allTables[name]];
                   });
               }
           },

           // Deprecate:
           complete: function (cb) {
               return this.on("complete", cb);
           },

           // Deprecate:
           error: function (cb) {
               return this.on("error", cb);
           },

           // Deprecate
           table: function (name) {
               if (this.storeNames.indexOf(name) === -1) throw new exceptions.InvalidTable("Table " + name + " not in transaction");
               return allTables[name];
           }
       });

       //
       //
       //
       // WhereClause
       //
       //
       //
       function WhereClause(table, index, orCollection) {
           /// <param name="table" type="Table"></param>
           /// <param name="index" type="String" optional="true"></param>
           /// <param name="orCollection" type="Collection" optional="true"></param>
           this._ctx = {
               table: table,
               index: index === ":id" ? null : index,
               collClass: table._collClass,
               or: orCollection
           };
       }

       props(WhereClause.prototype, function () {

           // WhereClause private methods

           function fail(collectionOrWhereClause, err, T) {
               var collection = collectionOrWhereClause instanceof WhereClause ? new collectionOrWhereClause._ctx.collClass(collectionOrWhereClause) : collectionOrWhereClause;

               collection._ctx.error = T ? new T(err) : new TypeError(err);
               return collection;
           }

           function emptyCollection(whereClause) {
               return new whereClause._ctx.collClass(whereClause, function () {
                   return IDBKeyRange.only("");
               }).limit(0);
           }

           function upperFactory(dir) {
               return dir === "next" ? function (s) {
                   return s.toUpperCase();
               } : function (s) {
                   return s.toLowerCase();
               };
           }
           function lowerFactory(dir) {
               return dir === "next" ? function (s) {
                   return s.toLowerCase();
               } : function (s) {
                   return s.toUpperCase();
               };
           }
           function nextCasing(key, lowerKey, upperNeedle, lowerNeedle, cmp, dir) {
               var length = Math.min(key.length, lowerNeedle.length);
               var llp = -1;
               for (var i = 0; i < length; ++i) {
                   var lwrKeyChar = lowerKey[i];
                   if (lwrKeyChar !== lowerNeedle[i]) {
                       if (cmp(key[i], upperNeedle[i]) < 0) return key.substr(0, i) + upperNeedle[i] + upperNeedle.substr(i + 1);
                       if (cmp(key[i], lowerNeedle[i]) < 0) return key.substr(0, i) + lowerNeedle[i] + upperNeedle.substr(i + 1);
                       if (llp >= 0) return key.substr(0, llp) + lowerKey[llp] + upperNeedle.substr(llp + 1);
                       return null;
                   }
                   if (cmp(key[i], lwrKeyChar) < 0) llp = i;
               }
               if (length < lowerNeedle.length && dir === "next") return key + upperNeedle.substr(key.length);
               if (length < key.length && dir === "prev") return key.substr(0, upperNeedle.length);
               return llp < 0 ? null : key.substr(0, llp) + lowerNeedle[llp] + upperNeedle.substr(llp + 1);
           }

           function addIgnoreCaseAlgorithm(whereClause, match, needles, suffix) {
               /// <param name="needles" type="Array" elementType="String"></param>
               var upper,
                   lower,
                   compare,
                   upperNeedles,
                   lowerNeedles,
                   direction,
                   nextKeySuffix,
                   needlesLen = needles.length;
               if (!needles.every(function (s) {
                   return typeof s === 'string';
               })) {
                   return fail(whereClause, STRING_EXPECTED);
               }
               function initDirection(dir) {
                   upper = upperFactory(dir);
                   lower = lowerFactory(dir);
                   compare = dir === "next" ? simpleCompare : simpleCompareReverse;
                   var needleBounds = needles.map(function (needle) {
                       return { lower: lower(needle), upper: upper(needle) };
                   }).sort(function (a, b) {
                       return compare(a.lower, b.lower);
                   });
                   upperNeedles = needleBounds.map(function (nb) {
                       return nb.upper;
                   });
                   lowerNeedles = needleBounds.map(function (nb) {
                       return nb.lower;
                   });
                   direction = dir;
                   nextKeySuffix = dir === "next" ? "" : suffix;
               }
               initDirection("next");

               var c = new whereClause._ctx.collClass(whereClause, function () {
                   return IDBKeyRange.bound(upperNeedles[0], lowerNeedles[needlesLen - 1] + suffix);
               });

               c._ondirectionchange = function (direction) {
                   // This event onlys occur before filter is called the first time.
                   initDirection(direction);
               };

               var firstPossibleNeedle = 0;

               c._addAlgorithm(function (cursor, advance, resolve) {
                   /// <param name="cursor" type="IDBCursor"></param>
                   /// <param name="advance" type="Function"></param>
                   /// <param name="resolve" type="Function"></param>
                   var key = cursor.key;
                   if (typeof key !== 'string') return false;
                   var lowerKey = lower(key);
                   if (match(lowerKey, lowerNeedles, firstPossibleNeedle)) {
                       return true;
                   } else {
                       var lowestPossibleCasing = null;
                       for (var i = firstPossibleNeedle; i < needlesLen; ++i) {
                           var casing = nextCasing(key, lowerKey, upperNeedles[i], lowerNeedles[i], compare, direction);
                           if (casing === null && lowestPossibleCasing === null) firstPossibleNeedle = i + 1;else if (lowestPossibleCasing === null || compare(lowestPossibleCasing, casing) > 0) {
                               lowestPossibleCasing = casing;
                           }
                       }
                       if (lowestPossibleCasing !== null) {
                           advance(function () {
                               cursor.continue(lowestPossibleCasing + nextKeySuffix);
                           });
                       } else {
                           advance(resolve);
                       }
                       return false;
                   }
               });
               return c;
           }

           //
           // WhereClause public methods
           //
           return {
               between: function (lower, upper, includeLower, includeUpper) {
                   /// <summary>
                   ///     Filter out records whose where-field lays between given lower and upper values. Applies to Strings, Numbers and Dates.
                   /// </summary>
                   /// <param name="lower"></param>
                   /// <param name="upper"></param>
                   /// <param name="includeLower" optional="true">Whether items that equals lower should be included. Default true.</param>
                   /// <param name="includeUpper" optional="true">Whether items that equals upper should be included. Default false.</param>
                   /// <returns type="Collection"></returns>
                   includeLower = includeLower !== false; // Default to true
                   includeUpper = includeUpper === true; // Default to false
                   try {
                       if (cmp(lower, upper) > 0 || cmp(lower, upper) === 0 && (includeLower || includeUpper) && !(includeLower && includeUpper)) return emptyCollection(this); // Workaround for idiotic W3C Specification that DataError must be thrown if lower > upper. The natural result would be to return an empty collection.
                       return new this._ctx.collClass(this, function () {
                           return IDBKeyRange.bound(lower, upper, !includeLower, !includeUpper);
                       });
                   } catch (e) {
                       return fail(this, INVALID_KEY_ARGUMENT);
                   }
               },
               equals: function (value) {
                   return new this._ctx.collClass(this, function () {
                       return IDBKeyRange.only(value);
                   });
               },
               above: function (value) {
                   return new this._ctx.collClass(this, function () {
                       return IDBKeyRange.lowerBound(value, true);
                   });
               },
               aboveOrEqual: function (value) {
                   return new this._ctx.collClass(this, function () {
                       return IDBKeyRange.lowerBound(value);
                   });
               },
               below: function (value) {
                   return new this._ctx.collClass(this, function () {
                       return IDBKeyRange.upperBound(value, true);
                   });
               },
               belowOrEqual: function (value) {
                   return new this._ctx.collClass(this, function () {
                       return IDBKeyRange.upperBound(value);
                   });
               },
               startsWith: function (str) {
                   /// <param name="str" type="String"></param>
                   if (typeof str !== 'string') return fail(this, STRING_EXPECTED);
                   return this.between(str, str + maxString, true, true);
               },
               startsWithIgnoreCase: function (str) {
                   /// <param name="str" type="String"></param>
                   if (str === "") return this.startsWith(str);
                   return addIgnoreCaseAlgorithm(this, function (x, a) {
                       return x.indexOf(a[0]) === 0;
                   }, [str], maxString);
               },
               equalsIgnoreCase: function (str) {
                   /// <param name="str" type="String"></param>
                   return addIgnoreCaseAlgorithm(this, function (x, a) {
                       return x === a[0];
                   }, [str], "");
               },
               anyOfIgnoreCase: function () {
                   var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                   if (set.length === 0) return emptyCollection(this);
                   return addIgnoreCaseAlgorithm(this, function (x, a) {
                       return a.indexOf(x) !== -1;
                   }, set, "");
               },
               startsWithAnyOfIgnoreCase: function () {
                   var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                   if (set.length === 0) return emptyCollection(this);
                   return addIgnoreCaseAlgorithm(this, function (x, a) {
                       return a.some(function (n) {
                           return x.indexOf(n) === 0;
                       });
                   }, set, maxString);
               },
               anyOf: function () {
                   var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                   var compare = ascending;
                   try {
                       set.sort(compare);
                   } catch (e) {
                       return fail(this, INVALID_KEY_ARGUMENT);
                   }
                   if (set.length === 0) return emptyCollection(this);
                   var c = new this._ctx.collClass(this, function () {
                       return IDBKeyRange.bound(set[0], set[set.length - 1]);
                   });

                   c._ondirectionchange = function (direction) {
                       compare = direction === "next" ? ascending : descending;
                       set.sort(compare);
                   };
                   var i = 0;
                   c._addAlgorithm(function (cursor, advance, resolve) {
                       var key = cursor.key;
                       while (compare(key, set[i]) > 0) {
                           // The cursor has passed beyond this key. Check next.
                           ++i;
                           if (i === set.length) {
                               // There is no next. Stop searching.
                               advance(resolve);
                               return false;
                           }
                       }
                       if (compare(key, set[i]) === 0) {
                           // The current cursor value should be included and we should continue a single step in case next item has the same key or possibly our next key in set.
                           return true;
                       } else {
                           // cursor.key not yet at set[i]. Forward cursor to the next key to hunt for.
                           advance(function () {
                               cursor.continue(set[i]);
                           });
                           return false;
                       }
                   });
                   return c;
               },

               notEqual: function (value) {
                   return this.inAnyRange([[-Infinity, value], [value, maxKey]], { includeLowers: false, includeUppers: false });
               },

               noneOf: function () {
                   var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                   if (set.length === 0) return new this._ctx.collClass(this); // Return entire collection.
                   try {
                       set.sort(ascending);
                   } catch (e) {
                       return fail(this, INVALID_KEY_ARGUMENT);
                   }
                   // Transform ["a","b","c"] to a set of ranges for between/above/below: [[-Infinity,"a"], ["a","b"], ["b","c"], ["c",maxKey]]
                   var ranges = set.reduce(function (res, val) {
                       return res ? res.concat([[res[res.length - 1][1], val]]) : [[-Infinity, val]];
                   }, null);
                   ranges.push([set[set.length - 1], maxKey]);
                   return this.inAnyRange(ranges, { includeLowers: false, includeUppers: false });
               },

               /** Filter out values withing given set of ranges.
               * Example, give children and elders a rebate of 50%:
               *
               *   db.friends.where('age').inAnyRange([[0,18],[65,Infinity]]).modify({Rebate: 1/2});
               *
               * @param {(string|number|Date|Array)[][]} ranges
               * @param {{includeLowers: boolean, includeUppers: boolean}} options
               */
               inAnyRange: function (ranges, options) {
                   var ctx = this._ctx;
                   if (ranges.length === 0) return emptyCollection(this);
                   if (!ranges.every(function (range) {
                       return range[0] !== undefined && range[1] !== undefined && ascending(range[0], range[1]) <= 0;
                   })) {
                       return fail(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", exceptions.InvalidArgument);
                   }
                   var includeLowers = !options || options.includeLowers !== false; // Default to true
                   var includeUppers = options && options.includeUppers === true; // Default to false

                   function addRange(ranges, newRange) {
                       for (var i = 0, l = ranges.length; i < l; ++i) {
                           var range = ranges[i];
                           if (cmp(newRange[0], range[1]) < 0 && cmp(newRange[1], range[0]) > 0) {
                               range[0] = min(range[0], newRange[0]);
                               range[1] = max(range[1], newRange[1]);
                               break;
                           }
                       }
                       if (i === l) ranges.push(newRange);
                       return ranges;
                   }

                   var sortDirection = ascending;
                   function rangeSorter(a, b) {
                       return sortDirection(a[0], b[0]);
                   }

                   // Join overlapping ranges
                   var set;
                   try {
                       set = ranges.reduce(addRange, []);
                       set.sort(rangeSorter);
                   } catch (ex) {
                       return fail(this, INVALID_KEY_ARGUMENT);
                   }

                   var i = 0;
                   var keyIsBeyondCurrentEntry = includeUppers ? function (key) {
                       return ascending(key, set[i][1]) > 0;
                   } : function (key) {
                       return ascending(key, set[i][1]) >= 0;
                   };

                   var keyIsBeforeCurrentEntry = includeLowers ? function (key) {
                       return descending(key, set[i][0]) > 0;
                   } : function (key) {
                       return descending(key, set[i][0]) >= 0;
                   };

                   function keyWithinCurrentRange(key) {
                       return !keyIsBeyondCurrentEntry(key) && !keyIsBeforeCurrentEntry(key);
                   }

                   var checkKey = keyIsBeyondCurrentEntry;

                   var c = new ctx.collClass(this, function () {
                       return IDBKeyRange.bound(set[0][0], set[set.length - 1][1], !includeLowers, !includeUppers);
                   });

                   c._ondirectionchange = function (direction) {
                       if (direction === "next") {
                           checkKey = keyIsBeyondCurrentEntry;
                           sortDirection = ascending;
                       } else {
                           checkKey = keyIsBeforeCurrentEntry;
                           sortDirection = descending;
                       }
                       set.sort(rangeSorter);
                   };

                   c._addAlgorithm(function (cursor, advance, resolve) {
                       var key = cursor.key;
                       while (checkKey(key)) {
                           // The cursor has passed beyond this key. Check next.
                           ++i;
                           if (i === set.length) {
                               // There is no next. Stop searching.
                               advance(resolve);
                               return false;
                           }
                       }
                       if (keyWithinCurrentRange(key)) {
                           // The current cursor value should be included and we should continue a single step in case next item has the same key or possibly our next key in set.
                           return true;
                       } else if (cmp(key, set[i][1]) === 0 || cmp(key, set[i][0]) === 0) {
                           // includeUpper or includeLower is false so keyWithinCurrentRange() returns false even though we are at range border.
                           // Continue to next key but don't include this one.
                           return false;
                       } else {
                           // cursor.key not yet at set[i]. Forward cursor to the next key to hunt for.
                           advance(function () {
                               if (sortDirection === ascending) cursor.continue(set[i][0]);else cursor.continue(set[i][1]);
                           });
                           return false;
                       }
                   });
                   return c;
               },
               startsWithAnyOf: function () {
                   var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);

                   if (!set.every(function (s) {
                       return typeof s === 'string';
                   })) {
                       return fail(this, "startsWithAnyOf() only works with strings");
                   }
                   if (set.length === 0) return emptyCollection(this);

                   return this.inAnyRange(set.map(function (str) {
                       return [str, str + maxString];
                   }));
               }
           };
       });

       //
       //
       //
       // Collection Class
       //
       //
       //
       function Collection(whereClause, keyRangeGenerator) {
           /// <summary>
           ///
           /// </summary>
           /// <param name="whereClause" type="WhereClause">Where clause instance</param>
           /// <param name="keyRangeGenerator" value="function(){ return IDBKeyRange.bound(0,1);}" optional="true"></param>
           var keyRange = null,
               error = null;
           if (keyRangeGenerator) try {
               keyRange = keyRangeGenerator();
           } catch (ex) {
               error = ex;
           }

           var whereCtx = whereClause._ctx,
               table = whereCtx.table;
           this._ctx = {
               table: table,
               index: whereCtx.index,
               isPrimKey: !whereCtx.index || table.schema.primKey.keyPath && whereCtx.index === table.schema.primKey.name,
               range: keyRange,
               keysOnly: false,
               dir: "next",
               unique: "",
               algorithm: null,
               filter: null,
               replayFilter: null,
               justLimit: true, // True if a replayFilter is just a filter that performs a "limit" operation (or none at all)
               isMatch: null,
               offset: 0,
               limit: Infinity,
               error: error, // If set, any promise must be rejected with this error
               or: whereCtx.or,
               valueMapper: table.hook.reading.fire
           };
       }

       function isPlainKeyRange(ctx, ignoreLimitFilter) {
           return !(ctx.filter || ctx.algorithm || ctx.or) && (ignoreLimitFilter ? ctx.justLimit : !ctx.replayFilter);
       }

       props(Collection.prototype, function () {

           //
           // Collection Private Functions
           //

           function addFilter(ctx, fn) {
               ctx.filter = combine(ctx.filter, fn);
           }

           function addReplayFilter(ctx, factory, isLimitFilter) {
               var curr = ctx.replayFilter;
               ctx.replayFilter = curr ? function () {
                   return combine(curr(), factory());
               } : factory;
               ctx.justLimit = isLimitFilter && !curr;
           }

           function addMatchFilter(ctx, fn) {
               ctx.isMatch = combine(ctx.isMatch, fn);
           }

           /** @param ctx {
            *      isPrimKey: boolean,
            *      table: Table,
            *      index: string
            * }
            * @param store IDBObjectStore
            **/
           function getIndexOrStore(ctx, store) {
               if (ctx.isPrimKey) return store;
               var indexSpec = ctx.table.schema.idxByName[ctx.index];
               if (!indexSpec) throw new exceptions.Schema("KeyPath " + ctx.index + " on object store " + store.name + " is not indexed");
               return store.index(indexSpec.name);
           }

           /** @param ctx {
            *      isPrimKey: boolean,
            *      table: Table,
            *      index: string,
            *      keysOnly: boolean,
            *      range?: IDBKeyRange,
            *      dir: "next" | "prev"
            * }
            */
           function openCursor(ctx, store) {
               var idxOrStore = getIndexOrStore(ctx, store);
               return ctx.keysOnly && 'openKeyCursor' in idxOrStore ? idxOrStore.openKeyCursor(ctx.range || null, ctx.dir + ctx.unique) : idxOrStore.openCursor(ctx.range || null, ctx.dir + ctx.unique);
           }

           function iter(ctx, fn, resolve, reject, idbstore) {
               var filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
               if (!ctx.or) {
                   iterate(openCursor(ctx, idbstore), combine(ctx.algorithm, filter), fn, resolve, reject, !ctx.keysOnly && ctx.valueMapper);
               } else (function () {
                   var set = {};
                   var resolved = 0;

                   function resolveboth() {
                       if (++resolved === 2) resolve(); // Seems like we just support or btwn max 2 expressions, but there are no limit because we do recursion.
                   }

                   function union(item, cursor, advance) {
                       if (!filter || filter(cursor, advance, resolveboth, reject)) {
                           var key = cursor.primaryKey.toString(); // Converts any Date to String, String to String, Number to String and Array to comma-separated string
                           if (!hasOwn(set, key)) {
                               set[key] = true;
                               fn(item, cursor, advance);
                           }
                       }
                   }

                   ctx.or._iterate(union, resolveboth, reject, idbstore);
                   iterate(openCursor(ctx, idbstore), ctx.algorithm, union, resolveboth, reject, !ctx.keysOnly && ctx.valueMapper);
               })();
           }
           function getInstanceTemplate(ctx) {
               return ctx.table.schema.instanceTemplate;
           }

           return {

               //
               // Collection Protected Functions
               //

               _read: function (fn, cb) {
                   var ctx = this._ctx;
                   if (ctx.error) return ctx.table._trans(null, function rejector(resolve, reject) {
                       reject(ctx.error);
                   });else return ctx.table._idbstore(READONLY, fn).then(cb);
               },
               _write: function (fn) {
                   var ctx = this._ctx;
                   if (ctx.error) return ctx.table._trans(null, function rejector(resolve, reject) {
                       reject(ctx.error);
                   });else return ctx.table._idbstore(READWRITE, fn, "locked"); // When doing write operations on collections, always lock the operation so that upcoming operations gets queued.
               },
               _addAlgorithm: function (fn) {
                   var ctx = this._ctx;
                   ctx.algorithm = combine(ctx.algorithm, fn);
               },

               _iterate: function (fn, resolve, reject, idbstore) {
                   return iter(this._ctx, fn, resolve, reject, idbstore);
               },

               clone: function (props) {
                   var rv = Object.create(this.constructor.prototype),
                       ctx = Object.create(this._ctx);
                   if (props) extend(ctx, props);
                   rv._ctx = ctx;
                   return rv;
               },

               raw: function () {
                   this._ctx.valueMapper = null;
                   return this;
               },

               //
               // Collection Public methods
               //

               each: function (fn) {
                   var ctx = this._ctx;

                   if (fake) {
                       var item = getInstanceTemplate(ctx),
                           primKeyPath = ctx.table.schema.primKey.keyPath,
                           key = getByKeyPath(item, ctx.index ? ctx.table.schema.idxByName[ctx.index].keyPath : primKeyPath),
                           primaryKey = getByKeyPath(item, primKeyPath);
                       fn(item, { key: key, primaryKey: primaryKey });
                   }

                   return this._read(function (resolve, reject, idbstore) {
                       iter(ctx, fn, resolve, reject, idbstore);
                   });
               },

               count: function (cb) {
                   if (fake) return Promise.resolve(0).then(cb);
                   var ctx = this._ctx;

                   if (isPlainKeyRange(ctx, true)) {
                       // This is a plain key range. We can use the count() method if the index.
                       return this._read(function (resolve, reject, idbstore) {
                           var idx = getIndexOrStore(ctx, idbstore);
                           var req = ctx.range ? idx.count(ctx.range) : idx.count();
                           req.onerror = eventRejectHandler(reject);
                           req.onsuccess = function (e) {
                               resolve(Math.min(e.target.result, ctx.limit));
                           };
                       }, cb);
                   } else {
                       // Algorithms, filters or expressions are applied. Need to count manually.
                       var count = 0;
                       return this._read(function (resolve, reject, idbstore) {
                           iter(ctx, function () {
                               ++count;return false;
                           }, function () {
                               resolve(count);
                           }, reject, idbstore);
                       }, cb);
                   }
               },

               sortBy: function (keyPath, cb) {
                   /// <param name="keyPath" type="String"></param>
                   var parts = keyPath.split('.').reverse(),
                       lastPart = parts[0],
                       lastIndex = parts.length - 1;
                   function getval(obj, i) {
                       if (i) return getval(obj[parts[i]], i - 1);
                       return obj[lastPart];
                   }
                   var order = this._ctx.dir === "next" ? 1 : -1;

                   function sorter(a, b) {
                       var aVal = getval(a, lastIndex),
                           bVal = getval(b, lastIndex);
                       return aVal < bVal ? -order : aVal > bVal ? order : 0;
                   }
                   return this.toArray(function (a) {
                       return a.sort(sorter);
                   }).then(cb);
               },

               toArray: function (cb) {
                   var ctx = this._ctx;
                   return this._read(function (resolve, reject, idbstore) {
                       fake && resolve([getInstanceTemplate(ctx)]);
                       if (hasGetAll && ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                           // Special optimation if we could use IDBObjectStore.getAll() or
                           // IDBKeyRange.getAll():
                           var readingHook = ctx.table.hook.reading.fire;
                           var idxOrStore = getIndexOrStore(ctx, idbstore);
                           var req = ctx.limit < Infinity ? idxOrStore.getAll(ctx.range, ctx.limit) : idxOrStore.getAll(ctx.range);
                           req.onerror = eventRejectHandler(reject);
                           req.onsuccess = readingHook === mirror ? eventSuccessHandler(resolve) : wrap(eventSuccessHandler(function (res) {
                               resolve(res.map(readingHook));
                           }));
                       } else {
                           // Getting array through a cursor.
                           var a = [];
                           iter(ctx, function (item) {
                               a.push(item);
                           }, function arrayComplete() {
                               resolve(a);
                           }, reject, idbstore);
                       }
                   }, cb);
               },

               offset: function (offset) {
                   var ctx = this._ctx;
                   if (offset <= 0) return this;
                   ctx.offset += offset; // For count()
                   if (isPlainKeyRange(ctx)) {
                       addReplayFilter(ctx, function () {
                           var offsetLeft = offset;
                           return function (cursor, advance) {
                               if (offsetLeft === 0) return true;
                               if (offsetLeft === 1) {
                                   --offsetLeft;return false;
                               }
                               advance(function () {
                                   cursor.advance(offsetLeft);
                                   offsetLeft = 0;
                               });
                               return false;
                           };
                       });
                   } else {
                       addReplayFilter(ctx, function () {
                           var offsetLeft = offset;
                           return function () {
                               return --offsetLeft < 0;
                           };
                       });
                   }
                   return this;
               },

               limit: function (numRows) {
                   this._ctx.limit = Math.min(this._ctx.limit, numRows); // For count()
                   addReplayFilter(this._ctx, function () {
                       var rowsLeft = numRows;
                       return function (cursor, advance, resolve) {
                           if (--rowsLeft <= 0) advance(resolve); // Stop after this item has been included
                           return rowsLeft >= 0; // If numRows is already below 0, return false because then 0 was passed to numRows initially. Otherwise we wouldnt come here.
                       };
                   }, true);
                   return this;
               },

               until: function (filterFunction, bIncludeStopEntry) {
                   var ctx = this._ctx;
                   fake && filterFunction(getInstanceTemplate(ctx));
                   addFilter(this._ctx, function (cursor, advance, resolve) {
                       if (filterFunction(cursor.value)) {
                           advance(resolve);
                           return bIncludeStopEntry;
                       } else {
                           return true;
                       }
                   });
                   return this;
               },

               first: function (cb) {
                   return this.limit(1).toArray(function (a) {
                       return a[0];
                   }).then(cb);
               },

               last: function (cb) {
                   return this.reverse().first(cb);
               },

               filter: function (filterFunction) {
                   /// <param name="jsFunctionFilter" type="Function">function(val){return true/false}</param>
                   fake && filterFunction(getInstanceTemplate(this._ctx));
                   addFilter(this._ctx, function (cursor) {
                       return filterFunction(cursor.value);
                   });
                   // match filters not used in Dexie.js but can be used by 3rd part libraries to test a
                   // collection for a match without querying DB. Used by Dexie.Observable.
                   addMatchFilter(this._ctx, filterFunction);
                   return this;
               },

               and: function (filterFunction) {
                   return this.filter(filterFunction);
               },

               or: function (indexName) {
                   return new WhereClause(this._ctx.table, indexName, this);
               },

               reverse: function () {
                   this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev";
                   if (this._ondirectionchange) this._ondirectionchange(this._ctx.dir);
                   return this;
               },

               desc: function () {
                   return this.reverse();
               },

               eachKey: function (cb) {
                   var ctx = this._ctx;
                   ctx.keysOnly = !ctx.isMatch;
                   return this.each(function (val, cursor) {
                       cb(cursor.key, cursor);
                   });
               },

               eachUniqueKey: function (cb) {
                   this._ctx.unique = "unique";
                   return this.eachKey(cb);
               },

               eachPrimaryKey: function (cb) {
                   var ctx = this._ctx;
                   ctx.keysOnly = !ctx.isMatch;
                   return this.each(function (val, cursor) {
                       cb(cursor.primaryKey, cursor);
                   });
               },

               keys: function (cb) {
                   var ctx = this._ctx;
                   ctx.keysOnly = !ctx.isMatch;
                   var a = [];
                   return this.each(function (item, cursor) {
                       a.push(cursor.key);
                   }).then(function () {
                       return a;
                   }).then(cb);
               },

               primaryKeys: function (cb) {
                   var ctx = this._ctx;
                   if (hasGetAll && ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                       // Special optimation if we could use IDBObjectStore.getAllKeys() or
                       // IDBKeyRange.getAllKeys():
                       return this._read(function (resolve, reject, idbstore) {
                           var idxOrStore = getIndexOrStore(ctx, idbstore);
                           var req = ctx.limit < Infinity ? idxOrStore.getAllKeys(ctx.range, ctx.limit) : idxOrStore.getAllKeys(ctx.range);
                           req.onerror = eventRejectHandler(reject);
                           req.onsuccess = eventSuccessHandler(resolve);
                       }).then(cb);
                   }
                   ctx.keysOnly = !ctx.isMatch;
                   var a = [];
                   return this.each(function (item, cursor) {
                       a.push(cursor.primaryKey);
                   }).then(function () {
                       return a;
                   }).then(cb);
               },

               uniqueKeys: function (cb) {
                   this._ctx.unique = "unique";
                   return this.keys(cb);
               },

               firstKey: function (cb) {
                   return this.limit(1).keys(function (a) {
                       return a[0];
                   }).then(cb);
               },

               lastKey: function (cb) {
                   return this.reverse().firstKey(cb);
               },

               distinct: function () {
                   var ctx = this._ctx,
                       idx = ctx.index && ctx.table.schema.idxByName[ctx.index];
                   if (!idx || !idx.multi) return this; // distinct() only makes differencies on multiEntry indexes.
                   var set = {};
                   addFilter(this._ctx, function (cursor) {
                       var strKey = cursor.primaryKey.toString(); // Converts any Date to String, String to String, Number to String and Array to comma-separated string
                       var found = hasOwn(set, strKey);
                       set[strKey] = true;
                       return !found;
                   });
                   return this;
               }
           };
       });

       //
       //
       // WriteableCollection Class
       //
       //
       function WriteableCollection() {
           Collection.apply(this, arguments);
       }

       derive(WriteableCollection).from(Collection).extend({

           //
           // WriteableCollection Public Methods
           //

           modify: function (changes) {
               var self = this,
                   ctx = this._ctx,
                   hook = ctx.table.hook,
                   updatingHook = hook.updating.fire,
                   deletingHook = hook.deleting.fire;

               fake && typeof changes === 'function' && changes.call({ value: ctx.table.schema.instanceTemplate }, ctx.table.schema.instanceTemplate);

               return this._write(function (resolve, reject, idbstore, trans) {
                   var modifyer;
                   if (typeof changes === 'function') {
                       // Changes is a function that may update, add or delete propterties or even require a deletion the object itself (delete this.item)
                       if (updatingHook === nop && deletingHook === nop) {
                           // Noone cares about what is being changed. Just let the modifier function be the given argument as is.
                           modifyer = changes;
                       } else {
                           // People want to know exactly what is being modified or deleted.
                           // Let modifyer be a proxy function that finds out what changes the caller is actually doing
                           // and call the hooks accordingly!
                           modifyer = function (item) {
                               var origItem = deepClone(item); // Clone the item first so we can compare laters.
                               if (changes.call(this, item, this) === false) return false; // Call the real modifyer function (If it returns false explicitely, it means it dont want to modify anyting on this object)
                               if (!hasOwn(this, "value")) {
                                   // The real modifyer function requests a deletion of the object. Inform the deletingHook that a deletion is taking place.
                                   deletingHook.call(this, this.primKey, item, trans);
                               } else {
                                   // No deletion. Check what was changed
                                   var objectDiff = getObjectDiff(origItem, this.value);
                                   var additionalChanges = updatingHook.call(this, objectDiff, this.primKey, origItem, trans);
                                   if (additionalChanges) {
                                       // Hook want to apply additional modifications. Make sure to fullfill the will of the hook.
                                       item = this.value;
                                       keys(additionalChanges).forEach(function (keyPath) {
                                           setByKeyPath(item, keyPath, additionalChanges[keyPath]); // Adding {keyPath: undefined} means that the keyPath should be deleted. Handled by setByKeyPath
                                       });
                                   }
                               }
                           };
                       }
                   } else if (updatingHook === nop) {
                           // changes is a set of {keyPath: value} and no one is listening to the updating hook.
                           var keyPaths = keys(changes);
                           var numKeys = keyPaths.length;
                           modifyer = function (item) {
                               var anythingModified = false;
                               for (var i = 0; i < numKeys; ++i) {
                                   var keyPath = keyPaths[i],
                                       val = changes[keyPath];
                                   if (getByKeyPath(item, keyPath) !== val) {
                                       setByKeyPath(item, keyPath, val); // Adding {keyPath: undefined} means that the keyPath should be deleted. Handled by setByKeyPath
                                       anythingModified = true;
                                   }
                               }
                               return anythingModified;
                           };
                       } else {
                           // changes is a set of {keyPath: value} and people are listening to the updating hook so we need to call it and
                           // allow it to add additional modifications to make.
                           var origChanges = changes;
                           changes = shallowClone(origChanges); // Let's work with a clone of the changes keyPath/value set so that we can restore it in case a hook extends it.
                           modifyer = function (item) {
                               var anythingModified = false;
                               var additionalChanges = updatingHook.call(this, changes, this.primKey, deepClone(item), trans);
                               if (additionalChanges) extend(changes, additionalChanges);
                               keys(changes).forEach(function (keyPath) {
                                   var val = changes[keyPath];
                                   if (getByKeyPath(item, keyPath) !== val) {
                                       setByKeyPath(item, keyPath, val);
                                       anythingModified = true;
                                   }
                               });
                               if (additionalChanges) changes = shallowClone(origChanges); // Restore original changes for next iteration
                               return anythingModified;
                           };
                       }

                   var count = 0;
                   var successCount = 0;
                   var iterationComplete = false;
                   var failures = [];
                   var failKeys = [];
                   var currentKey = null;

                   function modifyItem(item, cursor) {
                       currentKey = cursor.primaryKey;
                       var thisContext = {
                           primKey: cursor.primaryKey,
                           value: item,
                           onsuccess: null,
                           onerror: null
                       };

                       function onerror(e) {
                           failures.push(e);
                           failKeys.push(thisContext.primKey);
                           checkFinished();
                           return true; // Catch these errors and let a final rejection decide whether or not to abort entire transaction
                       }

                       if (modifyer.call(thisContext, item, thisContext) !== false) {
                           // If a callback explicitely returns false, do not perform the update!
                           var bDelete = !hasOwn(thisContext, "value");
                           ++count;
                           tryCatch(function () {
                               var req = bDelete ? cursor.delete() : cursor.update(thisContext.value);
                               req._hookCtx = thisContext;
                               req.onerror = hookedEventRejectHandler(onerror);
                               req.onsuccess = hookedEventSuccessHandler(function () {
                                   ++successCount;
                                   checkFinished();
                               });
                           }, onerror);
                       } else if (thisContext.onsuccess) {
                           // Hook will expect either onerror or onsuccess to always be called!
                           thisContext.onsuccess(thisContext.value);
                       }
                   }

                   function doReject(e) {
                       if (e) {
                           failures.push(e);
                           failKeys.push(currentKey);
                       }
                       return reject(new ModifyError("Error modifying one or more objects", failures, successCount, failKeys));
                   }

                   function checkFinished() {
                       if (iterationComplete && successCount + failures.length === count) {
                           if (failures.length > 0) doReject();else resolve(successCount);
                       }
                   }
                   self.clone().raw()._iterate(modifyItem, function () {
                       iterationComplete = true;
                       checkFinished();
                   }, doReject, idbstore);
               });
           },

           'delete': function () {
               var _this4 = this;

               var ctx = this._ctx,
                   range = ctx.range,
                   deletingHook = ctx.table.hook.deleting.fire,
                   hasDeleteHook = deletingHook !== nop;
               if (!hasDeleteHook && isPlainKeyRange(ctx) && (ctx.isPrimKey && !hangsOnDeleteLargeKeyRange || !range)) // if no range, we'll use clear().
                   {
                       // May use IDBObjectStore.delete(IDBKeyRange) in this case (Issue #208)
                       // For chromium, this is the way most optimized version.
                       // For IE/Edge, this could hang the indexedDB engine and make operating system instable
                       // (https://gist.github.com/dfahlander/5a39328f029de18222cf2125d56c38f7)
                       return this._write(function (resolve, reject, idbstore) {
                           // Our API contract is to return a count of deleted items, so we have to count() before delete().
                           var onerror = eventRejectHandler(reject),
                               countReq = range ? idbstore.count(range) : idbstore.count();
                           countReq.onerror = onerror;
                           countReq.onsuccess = function () {
                               var count = countReq.result;
                               tryCatch(function () {
                                   var delReq = range ? idbstore.delete(range) : idbstore.clear();
                                   delReq.onerror = onerror;
                                   delReq.onsuccess = function () {
                                       return resolve(count);
                                   };
                               }, function (err) {
                                   return reject(err);
                               });
                           };
                       });
                   }

               // Default version to use when collection is not a vanilla IDBKeyRange on the primary key.
               // Divide into chunks to not starve RAM.
               // If has delete hook, we will have to collect not just keys but also objects, so it will use
               // more memory and need lower chunk size.
               var CHUNKSIZE = hasDeleteHook ? 2000 : 10000;

               return this._write(function (resolve, reject, idbstore, trans) {
                   var totalCount = 0;
                   // Clone collection and change its table and set a limit of CHUNKSIZE on the cloned Collection instance.
                   var collection = _this4.clone({
                       keysOnly: !ctx.isMatch && !hasDeleteHook }) // load just keys (unless filter() or and() or deleteHook has subscribers)
                   .distinct() // In case multiEntry is used, never delete same key twice because resulting count
                   // would become larger than actual delete count.
                   .limit(CHUNKSIZE).raw(); // Don't filter through reading-hooks (like mapped classes etc)

                   var keysOrTuples = [];

                   // We're gonna do things on as many chunks that are needed.
                   // Use recursion of nextChunk function:
                   var nextChunk = function () {
                       return collection.each(hasDeleteHook ? function (val, cursor) {
                           // Somebody subscribes to hook('deleting'). Collect all primary keys and their values,
                           // so that the hook can be called with its values in bulkDelete().
                           keysOrTuples.push([cursor.primaryKey, cursor.value]);
                       } : function (val, cursor) {
                           // No one subscribes to hook('deleting'). Collect only primary keys:
                           keysOrTuples.push(cursor.primaryKey);
                       }).then(function () {
                           // Chromium deletes faster when doing it in sort order.
                           hasDeleteHook ? keysOrTuples.sort(function (a, b) {
                               return ascending(a[0], b[0]);
                           }) : keysOrTuples.sort(ascending);
                           return bulkDelete(idbstore, trans, keysOrTuples, hasDeleteHook, deletingHook);
                       }).then(function () {
                           var count = keysOrTuples.length;
                           totalCount += count;
                           keysOrTuples = [];
                           return count < CHUNKSIZE ? totalCount : nextChunk();
                       });
                   };

                   resolve(nextChunk());
               });
           }
       });

       //
       //
       //
       // ------------------------- Help functions ---------------------------
       //
       //
       //

       function lowerVersionFirst(a, b) {
           return a._cfg.version - b._cfg.version;
       }

       function setApiOnPlace(objs, tableNames, mode, dbschema) {
           tableNames.forEach(function (tableName) {
               var tableInstance = db._tableFactory(mode, dbschema[tableName]);
               objs.forEach(function (obj) {
                   tableName in obj || (obj[tableName] = tableInstance);
               });
           });
       }

       function removeTablesApi(objs) {
           objs.forEach(function (obj) {
               for (var key in obj) {
                   if (obj[key] instanceof Table) delete obj[key];
               }
           });
       }

       function iterate(req, filter, fn, resolve, reject, valueMapper) {

           // Apply valueMapper (hook('reading') or mappped class)
           var mappedFn = valueMapper ? function (x, c, a) {
               return fn(valueMapper(x), c, a);
           } : fn;
           // Wrap fn with PSD and microtick stuff from Promise.
           var wrappedFn = wrap(mappedFn, reject);

           if (!req.onerror) req.onerror = eventRejectHandler(reject);
           if (filter) {
               req.onsuccess = trycatcher(function filter_record() {
                   var cursor = req.result;
                   if (cursor) {
                       var c = function () {
                           cursor.continue();
                       };
                       if (filter(cursor, function (advancer) {
                           c = advancer;
                       }, resolve, reject)) wrappedFn(cursor.value, cursor, function (advancer) {
                           c = advancer;
                       });
                       c();
                   } else {
                       resolve();
                   }
               }, reject);
           } else {
               req.onsuccess = trycatcher(function filter_record() {
                   var cursor = req.result;
                   if (cursor) {
                       var c = function () {
                           cursor.continue();
                       };
                       wrappedFn(cursor.value, cursor, function (advancer) {
                           c = advancer;
                       });
                       c();
                   } else {
                       resolve();
                   }
               }, reject);
           }
       }

       function parseIndexSyntax(indexes) {
           /// <param name="indexes" type="String"></param>
           /// <returns type="Array" elementType="IndexSpec"></returns>
           var rv = [];
           indexes.split(',').forEach(function (index) {
               index = index.trim();
               var name = index.replace(/([&*]|\+\+)/g, ""); // Remove "&", "++" and "*"
               // Let keyPath of "[a+b]" be ["a","b"]:
               var keyPath = /^\[/.test(name) ? name.match(/^\[(.*)\]$/)[1].split('+') : name;

               rv.push(new IndexSpec(name, keyPath || null, /\&/.test(index), /\*/.test(index), /\+\+/.test(index), isArray(keyPath), /\./.test(index)));
           });
           return rv;
       }

       function cmp(key1, key2) {
           return indexedDB.cmp(key1, key2);
       }

       function min(a, b) {
           return cmp(a, b) < 0 ? a : b;
       }

       function max(a, b) {
           return cmp(a, b) > 0 ? a : b;
       }

       function ascending(a, b) {
           return indexedDB.cmp(a, b);
       }

       function descending(a, b) {
           return indexedDB.cmp(b, a);
       }

       function simpleCompare(a, b) {
           return a < b ? -1 : a === b ? 0 : 1;
       }

       function simpleCompareReverse(a, b) {
           return a > b ? -1 : a === b ? 0 : 1;
       }

       function combine(filter1, filter2) {
           return filter1 ? filter2 ? function () {
               return filter1.apply(this, arguments) && filter2.apply(this, arguments);
           } : filter1 : filter2;
       }

       function readGlobalSchema() {
           db.verno = idbdb.version / 10;
           db._dbSchema = globalSchema = {};
           dbStoreNames = slice(idbdb.objectStoreNames, 0);
           if (dbStoreNames.length === 0) return; // Database contains no stores.
           var trans = idbdb.transaction(safariMultiStoreFix(dbStoreNames), 'readonly');
           dbStoreNames.forEach(function (storeName) {
               var store = trans.objectStore(storeName),
                   keyPath = store.keyPath,
                   dotted = keyPath && typeof keyPath === 'string' && keyPath.indexOf('.') !== -1;
               var primKey = new IndexSpec(keyPath, keyPath || "", false, false, !!store.autoIncrement, keyPath && typeof keyPath !== 'string', dotted);
               var indexes = [];
               for (var j = 0; j < store.indexNames.length; ++j) {
                   var idbindex = store.index(store.indexNames[j]);
                   keyPath = idbindex.keyPath;
                   dotted = keyPath && typeof keyPath === 'string' && keyPath.indexOf('.') !== -1;
                   var index = new IndexSpec(idbindex.name, keyPath, !!idbindex.unique, !!idbindex.multiEntry, false, keyPath && typeof keyPath !== 'string', dotted);
                   indexes.push(index);
               }
               globalSchema[storeName] = new TableSchema(storeName, primKey, indexes, {});
           });
           setApiOnPlace([allTables, Transaction.prototype], keys(globalSchema), READWRITE, globalSchema);
       }

       function adjustToExistingIndexNames(schema, idbtrans) {
           /// <summary>
           /// Issue #30 Problem with existing db - adjust to existing index names when migrating from non-dexie db
           /// </summary>
           /// <param name="schema" type="Object">Map between name and TableSchema</param>
           /// <param name="idbtrans" type="IDBTransaction"></param>
           var storeNames = idbtrans.db.objectStoreNames;
           for (var i = 0; i < storeNames.length; ++i) {
               var storeName = storeNames[i];
               var store = idbtrans.objectStore(storeName);
               hasGetAll = 'getAll' in store;
               for (var j = 0; j < store.indexNames.length; ++j) {
                   var indexName = store.indexNames[j];
                   var keyPath = store.index(indexName).keyPath;
                   var dexieName = typeof keyPath === 'string' ? keyPath : "[" + slice(keyPath).join('+') + "]";
                   if (schema[storeName]) {
                       var indexSpec = schema[storeName].idxByName[dexieName];
                       if (indexSpec) indexSpec.name = indexName;
                   }
               }
           }
       }

       function fireOnBlocked(ev) {
           db.on("blocked").fire(ev);
           // Workaround (not fully*) for missing "versionchange" event in IE,Edge and Safari:
           connections.filter(function (c) {
               return c.name === db.name && c !== db && !c._vcFired;
           }).map(function (c) {
               return c.on("versionchange").fire(ev);
           });
       }

       extend(this, {
           Collection: Collection,
           Table: Table,
           Transaction: Transaction,
           Version: Version,
           WhereClause: WhereClause,
           WriteableCollection: WriteableCollection,
           WriteableTable: WriteableTable
       });

       init();

       addons.forEach(function (fn) {
           fn(db);
       });
   }

   var fakeAutoComplete = function () {}; // Will never be changed. We just fake for the IDE that we change it (see doFakeAutoComplete())
   var fake = false; // Will never be changed. We just fake for the IDE that we change it (see doFakeAutoComplete())

   function parseType(type) {
       if (typeof type === 'function') {
           return new type();
       } else if (isArray(type)) {
           return [parseType(type[0])];
       } else if (type && typeof type === 'object') {
           var rv = {};
           applyStructure(rv, type);
           return rv;
       } else {
           return type;
       }
   }

   function applyStructure(obj, structure) {
       keys(structure).forEach(function (member) {
           var value = parseType(structure[member]);
           obj[member] = value;
       });
       return obj;
   }

   function eventSuccessHandler(done) {
       return function (ev) {
           done(ev.target.result);
       };
   }

   function hookedEventSuccessHandler(resolve) {
       // wrap() is needed when calling hooks because the rare scenario of:
       //  * hook does a db operation that fails immediately (IDB throws exception)
       //    For calling db operations on correct transaction, wrap makes sure to set PSD correctly.
       //    wrap() will also execute in a virtual tick.
       //  * If not wrapped in a virtual tick, direct exception will launch a new physical tick.
       //  * If this was the last event in the bulk, the promise will resolve after a physical tick
       //    and the transaction will have committed already.
       // If no hook, the virtual tick will be executed in the reject()/resolve of the final promise,
       // because it is always marked with _lib = true when created using Transaction._promise().
       return wrap(function (event) {
           var req = event.target,
               result = req.result,
               ctx = req._hookCtx,
               // Contains the hook error handler. Put here instead of closure to boost performance.
           hookSuccessHandler = ctx && ctx.onsuccess;
           hookSuccessHandler && hookSuccessHandler(result);
           resolve && resolve(result);
       }, resolve);
   }

   function eventRejectHandler(reject) {
       return function (event) {
           preventDefault(event);
           reject(event.target.error);
           return false;
       };
   }

   function hookedEventRejectHandler(reject) {
       return wrap(function (event) {
           // See comment on hookedEventSuccessHandler() why wrap() is needed only when supporting hooks.

           var req = event.target,
               err = req.error,
               ctx = req._hookCtx,
               // Contains the hook error handler. Put here instead of closure to boost performance.
           hookErrorHandler = ctx && ctx.onerror;
           hookErrorHandler && hookErrorHandler(err);
           preventDefault(event);
           reject(err);
           return false;
       });
   }

   function preventDefault(event) {
       if (event.stopPropagation) // IndexedDBShim doesnt support this on Safari 8 and below.
           event.stopPropagation();
       if (event.preventDefault) // IndexedDBShim doesnt support this on Safari 8 and below.
           event.preventDefault();
   }

   function globalDatabaseList(cb) {
       var val,
           localStorage = Dexie.dependencies.localStorage;
       if (!localStorage) return cb([]); // Envs without localStorage support
       try {
           val = JSON.parse(localStorage.getItem('Dexie.DatabaseNames') || "[]");
       } catch (e) {
           val = [];
       }
       if (cb(val)) {
           localStorage.setItem('Dexie.DatabaseNames', JSON.stringify(val));
       }
   }

   function awaitIterator(iterator) {
       var callNext = function (result) {
           return iterator.next(result);
       },
           doThrow = function (error) {
           return iterator.throw(error);
       },
           onSuccess = step(callNext),
           onError = step(doThrow);

       function step(getNext) {
           return function (val) {
               var next = getNext(val),
                   value = next.value;

               return next.done ? value : !value || typeof value.then !== 'function' ? isArray(value) ? Promise.all(value).then(onSuccess, onError) : onSuccess(value) : value.then(onSuccess, onError);
           };
       }

       return step(callNext)();
   }

   //
   // IndexSpec struct
   //
   function IndexSpec(name, keyPath, unique, multi, auto, compound, dotted) {
       /// <param name="name" type="String"></param>
       /// <param name="keyPath" type="String"></param>
       /// <param name="unique" type="Boolean"></param>
       /// <param name="multi" type="Boolean"></param>
       /// <param name="auto" type="Boolean"></param>
       /// <param name="compound" type="Boolean"></param>
       /// <param name="dotted" type="Boolean"></param>
       this.name = name;
       this.keyPath = keyPath;
       this.unique = unique;
       this.multi = multi;
       this.auto = auto;
       this.compound = compound;
       this.dotted = dotted;
       var keyPathSrc = typeof keyPath === 'string' ? keyPath : keyPath && '[' + [].join.call(keyPath, '+') + ']';
       this.src = (unique ? '&' : '') + (multi ? '*' : '') + (auto ? "++" : "") + keyPathSrc;
   }

   //
   // TableSchema struct
   //
   function TableSchema(name, primKey, indexes, instanceTemplate) {
       /// <param name="name" type="String"></param>
       /// <param name="primKey" type="IndexSpec"></param>
       /// <param name="indexes" type="Array" elementType="IndexSpec"></param>
       /// <param name="instanceTemplate" type="Object"></param>
       this.name = name;
       this.primKey = primKey || new IndexSpec();
       this.indexes = indexes || [new IndexSpec()];
       this.instanceTemplate = instanceTemplate;
       this.mappedClass = null;
       this.idxByName = arrayToObject(indexes, function (index) {
           return [index.name, index];
       });
   }

   // Used in when defining dependencies later...
   // (If IndexedDBShim is loaded, prefer it before standard indexedDB)
   var idbshim = _global.idbModules && _global.idbModules.shimIndexedDB ? _global.idbModules : {};

   function safariMultiStoreFix(storeNames) {
       return storeNames.length === 1 ? storeNames[0] : storeNames;
   }

   function getNativeGetDatabaseNamesFn(indexedDB) {
       var fn = indexedDB && (indexedDB.getDatabaseNames || indexedDB.webkitGetDatabaseNames);
       return fn && fn.bind(indexedDB);
   }

   // Export Error classes
   props(Dexie, fullNameExceptions); // Dexie.XXXError = class XXXError {...};

   //
   // Static methods and properties
   //
   props(Dexie, {

       //
       // Static delete() method.
       //
       delete: function (databaseName) {
           var db = new Dexie(databaseName),
               promise = db.delete();
           promise.onblocked = function (fn) {
               db.on("blocked", fn);
               return this;
           };
           return promise;
       },

       //
       // Static exists() method.
       //
       exists: function (name) {
           return new Dexie(name).open().then(function (db) {
               db.close();
               return true;
           }).catch(Dexie.NoSuchDatabaseError, function () {
               return false;
           });
       },

       //
       // Static method for retrieving a list of all existing databases at current host.
       //
       getDatabaseNames: function (cb) {
           return new Promise(function (resolve, reject) {
               var getDatabaseNames = getNativeGetDatabaseNamesFn(indexedDB);
               if (getDatabaseNames) {
                   // In case getDatabaseNames() becomes standard, let's prepare to support it:
                   var req = getDatabaseNames();
                   req.onsuccess = function (event) {
                       resolve(slice(event.target.result, 0)); // Converst DOMStringList to Array<String>
                   };
                   req.onerror = eventRejectHandler(reject);
               } else {
                   globalDatabaseList(function (val) {
                       resolve(val);
                       return false;
                   });
               }
           }).then(cb);
       },

       defineClass: function (structure) {
           /// <summary>
           ///     Create a javascript constructor based on given template for which properties to expect in the class.
           ///     Any property that is a constructor function will act as a type. So {name: String} will be equal to {name: new String()}.
           /// </summary>
           /// <param name="structure">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
           /// know what type each member has. Example: {name: String, emailAddresses: [String], properties: {shoeSize: Number}}</param>

           // Default constructor able to copy given properties into this object.
           function Class(properties) {
               /// <param name="properties" type="Object" optional="true">Properties to initialize object with.
               /// </param>
               properties ? extend(this, properties) : fake && applyStructure(this, structure);
           }
           return Class;
       },

       applyStructure: applyStructure,

       ignoreTransaction: function (scopeFunc) {
           // In case caller is within a transaction but needs to create a separate transaction.
           // Example of usage:
           //
           // Let's say we have a logger function in our app. Other application-logic should be unaware of the
           // logger function and not need to include the 'logentries' table in all transaction it performs.
           // The logging should always be done in a separate transaction and not be dependant on the current
           // running transaction context. Then you could use Dexie.ignoreTransaction() to run code that starts a new transaction.
           //
           //     Dexie.ignoreTransaction(function() {
           //         db.logentries.add(newLogEntry);
           //     });
           //
           // Unless using Dexie.ignoreTransaction(), the above example would try to reuse the current transaction
           // in current Promise-scope.
           //
           // An alternative to Dexie.ignoreTransaction() would be setImmediate() or setTimeout(). The reason we still provide an
           // API for this because
           //  1) The intention of writing the statement could be unclear if using setImmediate() or setTimeout().
           //  2) setTimeout() would wait unnescessary until firing. This is however not the case with setImmediate().
           //  3) setImmediate() is not supported in the ES standard.
           //  4) You might want to keep other PSD state that was set in a parent PSD, such as PSD.letThrough.
           return PSD.trans ? usePSD(PSD.transless, scopeFunc) : // Use the closest parent that was non-transactional.
           scopeFunc(); // No need to change scope because there is no ongoing transaction.
       },

       vip: function (fn) {
           // To be used by subscribers to the on('ready') event.
           // This will let caller through to access DB even when it is blocked while the db.ready() subscribers are firing.
           // This would have worked automatically if we were certain that the Provider was using Dexie.Promise for all asyncronic operations. The promise PSD
           // from the provider.connect() call would then be derived all the way to when provider would call localDatabase.applyChanges(). But since
           // the provider more likely is using non-promise async APIs or other thenable implementations, we cannot assume that.
           // Note that this method is only useful for on('ready') subscribers that is returning a Promise from the event. If not using vip()
           // the database could deadlock since it wont open until the returned Promise is resolved, and any non-VIPed operation started by
           // the caller will not resolve until database is opened.
           return newScope(function () {
               PSD.letThrough = true; // Make sure we are let through if still blocking db due to onready is firing.
               return fn();
           });
       },

       async: function (generatorFn) {
           return function () {
               try {
                   var rv = awaitIterator(generatorFn.apply(this, arguments));
                   if (!rv || typeof rv.then !== 'function') return Promise.resolve(rv);
                   return rv;
               } catch (e) {
                   return rejection(e);
               }
           };
       },

       spawn: function (generatorFn, args, thiz) {
           try {
               var rv = awaitIterator(generatorFn.apply(thiz, args || []));
               if (!rv || typeof rv.then !== 'function') return Promise.resolve(rv);
               return rv;
           } catch (e) {
               return rejection(e);
           }
       },

       // Dexie.currentTransaction property
       currentTransaction: {
           get: function () {
               return PSD.trans || null;
           }
       },

       // Export our Promise implementation since it can be handy as a standalone Promise implementation
       Promise: Promise,

       // Dexie.debug proptery:
       // Dexie.debug = false
       // Dexie.debug = true
       // Dexie.debug = "dexie" - don't hide dexie's stack frames.
       debug: {
           get: function () {
               return debug;
           },
           set: function (value) {
               setDebug(value, value === 'dexie' ? function () {
                   return true;
               } : dexieStackFrameFilter);
           }
       },

       // Export our derive/extend/override methodology
       derive: derive,
       extend: extend,
       props: props,
       override: override,
       // Export our Events() function - can be handy as a toolkit
       Events: Events,
       events: Events, // Backward compatible lowercase version. Deprecate.
       // Utilities
       getByKeyPath: getByKeyPath,
       setByKeyPath: setByKeyPath,
       delByKeyPath: delByKeyPath,
       shallowClone: shallowClone,
       deepClone: deepClone,
       getObjectDiff: getObjectDiff,
       asap: asap,
       maxKey: maxKey,
       // Addon registry
       addons: [],
       // Global DB connection list
       connections: connections,

       MultiModifyError: exceptions.Modify, // Backward compatibility 0.9.8. Deprecate.
       errnames: errnames,

       // Export other static classes
       IndexSpec: IndexSpec,
       TableSchema: TableSchema,

       //
       // Dependencies
       //
       // These will automatically work in browsers with indexedDB support, or where an indexedDB polyfill has been included.
       //
       // In node.js, however, these properties must be set "manually" before instansiating a new Dexie().
       // For node.js, you need to require indexeddb-js or similar and then set these deps.
       //
       dependencies: {
           // Required:
           indexedDB: idbshim.shimIndexedDB || _global.indexedDB || _global.mozIndexedDB || _global.webkitIndexedDB || _global.msIndexedDB,
           IDBKeyRange: idbshim.IDBKeyRange || _global.IDBKeyRange || _global.webkitIDBKeyRange
       },

       // API Version Number: Type Number, make sure to always set a version number that can be comparable correctly. Example: 0.9, 0.91, 0.92, 1.0, 1.01, 1.1, 1.2, 1.21, etc.
       semVer: DEXIE_VERSION,
       version: DEXIE_VERSION.split('.').map(function (n) {
           return parseInt(n);
       }).reduce(function (p, c, i) {
           return p + c / Math.pow(10, i * 2);
       }),
       fakeAutoComplete: fakeAutoComplete,

       // https://github.com/dfahlander/Dexie.js/issues/186
       // typescript compiler tsc in mode ts-->es5 & commonJS, will expect require() to return
       // x.default. Workaround: Set Dexie.default = Dexie.
       default: Dexie
   });

   tryCatch(function () {
       // Optional dependencies
       // localStorage
       Dexie.dependencies.localStorage = (typeof chrome !== "undefined" && chrome !== null ? chrome.storage : void 0) != null ? null : _global.localStorage;
   });

   // Map DOMErrors and DOMExceptions to corresponding Dexie errors. May change in Dexie v2.0.
   Promise.rejectionMapper = mapError;

   // Fool IDE to improve autocomplete. Tested with Visual Studio 2013 and 2015.
   doFakeAutoComplete(function () {
       Dexie.fakeAutoComplete = fakeAutoComplete = doFakeAutoComplete;
       Dexie.fake = fake = true;
   });

   return Dexie;

}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
/**
 *  Firebase libraries for browser - npm package.
 *
 * Usage:
 *
 *   firebase = require('firebase');
 */
require('./firebase');
module.exports = firebase;

},{"./firebase":4}],4:[function(require,module,exports){
(function (global){
/*! @license Firebase v3.2.1
    Build: 3.2.1-rc.3
    Terms: https://developers.google.com/terms */
(function() { var k="undefined"!=typeof window&&window===this?this:"undefined"!=typeof global?global:this,m={},n=function(a,b){(m[a]=m[a]||[]).push(b);var c=k;a=a.split(".");for(var d=0;d<a.length-1&&c;d++)c=c[a[d]];a=a[a.length-1];c&&c[a]instanceof Function&&(c[a]=b(c[a]))},p=function(){p=function(){};if(!k.Symbol){k.Symbol=aa;var a=[],b=function(b){return function(d){a=[];d=b(d);for(var e=[],g=0,h=d.length;g<h;g++){var f;a:if(f=d[g],14>f.length)f=!1;else{for(var l=0;14>l;l++)if(f[l]!="jscomp_symbol_"[l]){f=!1;
break a}f=!0}f?a.push(d[g]):e.push(d[g])}return e}};n("Object.keys",b);n("Object.getOwnPropertyNames",b);n("Object.getOwnPropertySymbols",function(c){return function(d){b.ca=Object.getOwnPropertyNames(d);a.push.apply(c(d));return a}})}},ba=0,aa=function(a){return"jscomp_symbol_"+a+ba++},q=function(){p();k.Symbol.iterator||(k.Symbol.iterator=k.Symbol("iterator"));q=function(){}},ca=function(){var a=["next","error","complete"];q();var b=a[Symbol.iterator];if(b)return b.call(a);var c=0;return{next:function(){return c<
a.length?{done:!1,value:a[c++]}:{done:!0}}}},da="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){if(c.get||c.set)throw new TypeError("ES3 does not support getters and setters.");a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)},r=function(a,b){if(b){for(var c=k,d=a.split("."),e=0;e<d.length-1;e++){var g=d[e];g in c||(c[g]={});c=c[g]}d=d[d.length-1];e=c[d];b=b(e);if(b!=e){a=m[a]||[];for(e=0;e<a.length;e++)b=a[e](b);da(c,d,{configurable:!0,writable:!0,value:b})}}};
r("String.prototype.repeat",function(a){return a?a:function(a){var c;if(null==this)throw new TypeError("The 'this' value for String.prototype.repeat must not be null or undefined");c=this+"";if(0>a||1342177279<a)throw new RangeError("Invalid count value");a|=0;for(var d="";a;)if(a&1&&(d+=c),a>>>=1)c+=c;return d}});
var ea=function(a,b){q();a instanceof String&&(a+="");var c=0,d={next:function(){if(c<a.length){var e=c++;return{value:b(e,a[e]),done:!1}}d.next=function(){return{done:!0,value:void 0}};return d.next()}};d[Symbol.iterator]=function(){return d};return d};r("Array.prototype.keys",function(a){return a?a:function(){return ea(this,function(a){return a})}});
var t=this,u=function(){},v=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b},w=function(a){return"function"==v(a)},fa=function(a,b,c){return a.call.apply(a.bind,arguments)},ga=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}},x=function(a,b,c){x=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?
fa:ga;return x.apply(null,arguments)},y=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}},z=function(a,b){function c(){}c.prototype=b.prototype;a.ba=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.aa=function(a,c,g){for(var h=Array(arguments.length-2),f=2;f<arguments.length;f++)h[f-2]=arguments[f];return b.prototype[c].apply(a,h)}};function __extends(a,b){function c(){this.constructor=a}for(var d in b)b.hasOwnProperty(d)&&(a[d]=b[d]);a.prototype=null===b?Object.create(b):(c.prototype=b.prototype,new c)}
function __decorate(a,b,c,d){var e=arguments.length,g=3>e?b:null===d?d=Object.getOwnPropertyDescriptor(b,c):d,h;h=(window||global).Reflect;if("object"===typeof h&&"function"===typeof h.decorate)g=h.decorate(a,b,c,d);else for(var f=a.length-1;0<=f;f--)if(h=a[f])g=(3>e?h(g):3<e?h(b,c,g):h(b,c))||g;return 3<e&&g&&Object.defineProperty(b,c,g),g}function __metadata(a,b){var c=(window||global).Reflect;if("object"===typeof c&&"function"===typeof c.metadata)return c.metadata(a,b)}
var __param=function(a,b){return function(c,d){b(c,d,a)}},__awaiter=function(a,b,c,d){return new (c||(c=Promise))(function(e,g){function h(a){try{l(d.next(a))}catch(b){g(b)}}function f(a){try{l(d.throw(a))}catch(b){g(b)}}function l(a){a.done?e(a.value):(new c(function(b){b(a.value)})).then(h,f)}l((d=d.apply(a,b)).next())})};var A=function(a){if(Error.captureStackTrace)Error.captureStackTrace(this,A);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))};z(A,Error);A.prototype.name="CustomError";var ha=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")};var B=function(a,b){b.unshift(a);A.call(this,ha.apply(null,b));b.shift()};z(B,A);B.prototype.name="AssertionError";var ia=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),g=d;else a&&(e+=": "+a,g=b);throw new B(""+e,g||[]);},C=function(a,b,c){a||ia("",null,b,Array.prototype.slice.call(arguments,2))},D=function(a,b,c){w(a)||ia("Expected function but got %s: %s.",[v(a),a],b,Array.prototype.slice.call(arguments,2))};var E=function(a,b,c){this.S=c;this.L=a;this.U=b;this.s=0;this.o=null};E.prototype.get=function(){var a;0<this.s?(this.s--,a=this.o,this.o=a.next,a.next=null):a=this.L();return a};E.prototype.put=function(a){this.U(a);this.s<this.S&&(this.s++,a.next=this.o,this.o=a)};var F;a:{var ja=t.navigator;if(ja){var ka=ja.userAgent;if(ka){F=ka;break a}}F=""};var la=function(a){t.setTimeout(function(){throw a;},0)},G,ma=function(){var a=t.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&-1==F.indexOf("Presto")&&(a=function(){var a=document.createElement("IFRAME");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+
"//"+b.location.host,a=x(function(a){if(("*"==d||a.origin==d)&&a.data==c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&-1==F.indexOf("Trident")&&-1==F.indexOf("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(void 0!==c.next){c=c.next;var a=c.F;c.F=null;a()}};return function(a){d.next={F:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in
document.createElement("SCRIPT")?function(a){var b=document.createElement("SCRIPT");b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){t.setTimeout(a,0)}};var H=function(){this.v=this.f=null},na=new E(function(){return new I},function(a){a.reset()},100);H.prototype.add=function(a,b){var c=na.get();c.set(a,b);this.v?this.v.next=c:(C(!this.f),this.f=c);this.v=c};H.prototype.remove=function(){var a=null;this.f&&(a=this.f,this.f=this.f.next,this.f||(this.v=null),a.next=null);return a};var I=function(){this.next=this.scope=this.B=null};I.prototype.set=function(a,b){this.B=a;this.scope=b;this.next=null};
I.prototype.reset=function(){this.next=this.scope=this.B=null};var M=function(a,b){J||oa();L||(J(),L=!0);pa.add(a,b)},J,oa=function(){if(t.Promise&&t.Promise.resolve){var a=t.Promise.resolve(void 0);J=function(){a.then(qa)}}else J=function(){var a=qa,c;!(c=!w(t.setImmediate))&&(c=t.Window&&t.Window.prototype)&&(c=-1==F.indexOf("Edge")&&t.Window.prototype.setImmediate==t.setImmediate);c?(G||(G=ma()),G(a)):t.setImmediate(a)}},L=!1,pa=new H,qa=function(){for(var a;a=pa.remove();){try{a.B.call(a.scope)}catch(b){la(b)}na.put(a)}L=!1};var O=function(a,b){this.b=0;this.K=void 0;this.j=this.g=this.u=null;this.m=this.A=!1;if(a!=u)try{var c=this;a.call(b,function(a){N(c,2,a)},function(a){try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}N(c,3,a)})}catch(d){N(this,3,d)}},ra=function(){this.next=this.context=this.h=this.c=this.child=null;this.w=!1};ra.prototype.reset=function(){this.context=this.h=this.c=this.child=null;this.w=!1};
var sa=new E(function(){return new ra},function(a){a.reset()},100),ta=function(a,b,c){var d=sa.get();d.c=a;d.h=b;d.context=c;return d},va=function(a,b,c){ua(a,b,c,null)||M(y(b,a))};O.prototype.then=function(a,b,c){null!=a&&D(a,"opt_onFulfilled should be a function.");null!=b&&D(b,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?");return wa(this,w(a)?a:null,w(b)?b:null,c)};O.prototype.then=O.prototype.then;O.prototype.$goog_Thenable=!0;
O.prototype.X=function(a,b){return wa(this,null,a,b)};var ya=function(a,b){a.g||2!=a.b&&3!=a.b||xa(a);C(null!=b.c);a.j?a.j.next=b:a.g=b;a.j=b},wa=function(a,b,c,d){var e=ta(null,null,null);e.child=new O(function(a,h){e.c=b?function(c){try{var e=b.call(d,c);a(e)}catch(K){h(K)}}:a;e.h=c?function(b){try{var e=c.call(d,b);a(e)}catch(K){h(K)}}:h});e.child.u=a;ya(a,e);return e.child};O.prototype.Y=function(a){C(1==this.b);this.b=0;N(this,2,a)};O.prototype.Z=function(a){C(1==this.b);this.b=0;N(this,3,a)};
var N=function(a,b,c){0==a.b&&(a===c&&(b=3,c=new TypeError("Promise cannot resolve to itself")),a.b=1,ua(c,a.Y,a.Z,a)||(a.K=c,a.b=b,a.u=null,xa(a),3!=b||za(a,c)))},ua=function(a,b,c,d){if(a instanceof O)return null!=b&&D(b,"opt_onFulfilled should be a function."),null!=c&&D(c,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?"),ya(a,ta(b||u,c||null,d)),!0;var e;if(a)try{e=!!a.$goog_Thenable}catch(h){e=!1}else e=!1;if(e)return a.then(b,c,d),
!0;e=typeof a;if("object"==e&&null!=a||"function"==e)try{var g=a.then;if(w(g))return Aa(a,g,b,c,d),!0}catch(h){return c.call(d,h),!0}return!1},Aa=function(a,b,c,d,e){var g=!1,h=function(a){g||(g=!0,c.call(e,a))},f=function(a){g||(g=!0,d.call(e,a))};try{b.call(a,h,f)}catch(l){f(l)}},xa=function(a){a.A||(a.A=!0,M(a.N,a))},Ba=function(a){var b=null;a.g&&(b=a.g,a.g=b.next,b.next=null);a.g||(a.j=null);null!=b&&C(null!=b.c);return b};
O.prototype.N=function(){for(var a;a=Ba(this);){var b=this.b,c=this.K;if(3==b&&a.h&&!a.w){var d;for(d=this;d&&d.m;d=d.u)d.m=!1}if(a.child)a.child.u=null,Ca(a,b,c);else try{a.w?a.c.call(a.context):Ca(a,b,c)}catch(e){Da.call(null,e)}sa.put(a)}this.A=!1};var Ca=function(a,b,c){2==b?a.c.call(a.context,c):a.h&&a.h.call(a.context,c)},za=function(a,b){a.m=!0;M(function(){a.m&&Da.call(null,b)})},Da=la;function P(a,b){if(!(b instanceof Object))return b;switch(b.constructor){case Date:return new Date(b.getTime());case Object:void 0===a&&(a={});break;case Array:a=[];break;default:return b}for(var c in b)b.hasOwnProperty(c)&&(a[c]=P(a[c],b[c]));return a};var Ea=Error.captureStackTrace,R=function(a,b){this.code=a;this.message=b;if(Ea)Ea(this,Q.prototype.create);else{var c=Error.apply(this,arguments);this.name="FirebaseError";Object.defineProperty(this,"stack",{get:function(){return c.stack}})}};R.prototype=Object.create(Error.prototype);R.prototype.constructor=R;R.prototype.name="FirebaseError";var Q=function(a,b,c){this.V=a;this.W=b;this.M=c;this.pattern=/\{\$([^}]+)}/g};
Q.prototype.create=function(a,b){void 0===b&&(b={});var c=this.M[a];a=this.V+"/"+a;var c=void 0===c?"Error":c.replace(this.pattern,function(a,c){return void 0!==b[c]?b[c].toString():"<"+c+"?>"}),c=this.W+": "+c+" ("+a+").",c=new R(a,c),d;for(d in b)b.hasOwnProperty(d)&&"_"!==d.slice(-1)&&(c[d]=b[d]);return c};O.all=function(a){return new O(function(b,c){var d=a.length,e=[];if(d)for(var g=function(a,c){d--;e[a]=c;0==d&&b(e)},h=function(a){c(a)},f=0,l;f<a.length;f++)l=a[f],va(l,y(g,f),h);else b(e)})};O.resolve=function(a){if(a instanceof O)return a;var b=new O(u);N(b,2,a);return b};O.reject=function(a){return new O(function(b,c){c(a)})};O.prototype["catch"]=O.prototype.X;var S=O;"undefined"!==typeof Promise&&(S=Promise);var Fa=S;function Ga(a,b){a=new T(a,b);return a.subscribe.bind(a)}var T=function(a,b){var c=this;this.a=[];this.J=0;this.task=Fa.resolve();this.l=!1;this.D=b;this.task.then(function(){a(c)}).catch(function(a){c.error(a)})};T.prototype.next=function(a){U(this,function(b){b.next(a)})};T.prototype.error=function(a){U(this,function(b){b.error(a)});this.close(a)};T.prototype.complete=function(){U(this,function(a){a.complete()});this.close()};
T.prototype.subscribe=function(a,b,c){var d=this,e;if(void 0===a&&void 0===b&&void 0===c)throw Error("Missing Observer.");e=Ha(a)?a:{next:a,error:b,complete:c};void 0===e.next&&(e.next=V);void 0===e.error&&(e.error=V);void 0===e.complete&&(e.complete=V);a=this.$.bind(this,this.a.length);this.l&&this.task.then(function(){try{d.G?e.error(d.G):e.complete()}catch(a){}});this.a.push(e);return a};
T.prototype.$=function(a){void 0!==this.a&&void 0!==this.a[a]&&(this.a[a]=void 0,--this.J,0===this.J&&void 0!==this.D&&this.D(this))};var U=function(a,b){if(!a.l)for(var c=0;c<a.a.length;c++)Ia(a,c,b)},Ia=function(a,b,c){a.task.then(function(){if(void 0!==a.a&&void 0!==a.a[b])try{c(a.a[b])}catch(d){}})};T.prototype.close=function(a){var b=this;this.l||(this.l=!0,void 0!==a&&(this.G=a),this.task.then(function(){b.a=void 0;b.D=void 0}))};
function Ha(a){if("object"!==typeof a||null===a)return!1;for(var b=ca(),c=b.next();!c.done;c=b.next())if(c=c.value,c in a&&"function"===typeof a[c])return!0;return!1}function V(){};var W=S,X=function(a,b,c){var d=this;this.H=c;this.I=!1;this.i={};this.P={};this.C=b;this.T=P(void 0,a);Object.keys(c.INTERNAL.factories).forEach(function(a){d[a]=d.R.bind(d,a)})};X.prototype.delete=function(){var a=this;return(new W(function(b){Y(a);b()})).then(function(){a.H.INTERNAL.removeApp(a.C);return W.all(Object.keys(a.i).map(function(b){return a.i[b].INTERNAL.delete()}))}).then(function(){a.I=!0;a.i=null;a.P=null})};
X.prototype.R=function(a){Y(this);void 0===this.i[a]&&(this.i[a]=this.H.INTERNAL.factories[a](this,this.O.bind(this)));return this.i[a]};X.prototype.O=function(a){P(this,a)};var Y=function(a){a.I&&Z(Ja("deleted",{name:a.C}))};Object.defineProperties(X.prototype,{name:{configurable:!0,enumerable:!0,get:function(){Y(this);return this.C}},options:{configurable:!0,enumerable:!0,get:function(){Y(this);return this.T}}});X.prototype.name&&X.prototype.options||X.prototype.delete||console.log("dc");
function Ka(){function a(a){a=a||"[DEFAULT]";var c=b[a];void 0===c&&Z("noApp",{name:a});return c}var b={},c={},d=[],e={__esModule:!0,initializeApp:function(a,c){void 0===c?c="[DEFAULT]":"string"===typeof c&&""!==c||Z("bad-app-name",{name:c+""});void 0!==b[c]&&Z("dupApp",{name:c});var f=new X(a,c,e);b[c]=f;d.forEach(function(a){return a("create",f)});void 0!=f.INTERNAL&&void 0!=f.INTERNAL.getToken||P(f,{INTERNAL:{getToken:function(){return W.resolve(null)},addAuthTokenListener:function(){},removeAuthTokenListener:function(){}}});
return f},app:a,apps:null,Promise:W,SDK_VERSION:"0.0.0",INTERNAL:{registerService:function(b,d,f){c[b]&&Z("dupService",{name:b});c[b]=d;d=function(c){void 0===c&&(c=a());return c[b]()};void 0!==f&&P(d,f);return e[b]=d},createFirebaseNamespace:Ka,extendNamespace:function(a){P(e,a)},createSubscribe:Ga,ErrorFactory:Q,registerAppHook:function(a){d.push(a)},removeApp:function(a){d.forEach(function(c){return c("delete",b[a])});delete b[a]},factories:c,Promise:O,deepExtend:P}};e["default"]=e;Object.defineProperty(e,
"apps",{get:function(){return Object.keys(b).map(function(a){return b[a]})}});a.App=X;return e}function Z(a,b){throw Error(Ja(a,b));}
function Ja(a,b){b=b||{};b={noApp:"No Firebase App '"+b.name+"' has been created - call Firebase App.initializeApp().","bad-app-name":"Illegal App name: '"+b.name+"'.",dupApp:"Firebase App named '"+b.name+"' already exists.",deleted:"Firebase App named '"+b.name+"' already deleted.",dupService:"Firebase Service named '"+b.name+"' already registered."}[a];return void 0===b?"Application Error: ("+a+")":b};"undefined"!==typeof window&&(window.firebase=Ka()); })();
firebase.SDK_VERSION = "3.2.1";
(function(){var h,aa=aa||{},l=this,ba=function(){},ca=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&
!a.propertyIsEnumerable("call"))return"function"}else return"null";else if("function"==b&&"undefined"==typeof a.call)return"object";return b},da=function(a){return null===a},ea=function(a){return"array"==ca(a)},fa=function(a){var b=ca(a);return"array"==b||"object"==b&&"number"==typeof a.length},m=function(a){return"string"==typeof a},ga=function(a){return"number"==typeof a},n=function(a){return"function"==ca(a)},ha=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b},ia=function(a,
b,c){return a.call.apply(a.bind,arguments)},ja=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}},q=function(a,b,c){q=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ia:ja;return q.apply(null,arguments)},ka=function(a,b){var c=Array.prototype.slice.call(arguments,
1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}},la=Date.now||function(){return+new Date},r=function(a,b){function c(){}c.prototype=b.prototype;a.Ic=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Ke=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};var t=function(a){if(Error.captureStackTrace)Error.captureStackTrace(this,t);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))};r(t,Error);t.prototype.name="CustomError";var ma=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")},na=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")},oa=/&/g,pa=/</g,qa=/>/g,ra=/"/g,sa=/'/g,ta=/\x00/g,ua=/[\x00&<>"']/,u=function(a,b){return-1!=a.indexOf(b)},va=function(a,b){return a<b?-1:a>b?1:0};var wa=function(a,b){b.unshift(a);t.call(this,ma.apply(null,b));b.shift()};r(wa,t);wa.prototype.name="AssertionError";
var xa=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),f=d;else a&&(e+=": "+a,f=b);throw new wa(""+e,f||[]);},v=function(a,b,c){a||xa("",null,b,Array.prototype.slice.call(arguments,2))},ya=function(a,b){throw new wa("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));},za=function(a,b,c){ga(a)||xa("Expected number but got %s: %s.",[ca(a),a],b,Array.prototype.slice.call(arguments,2));return a},Aa=function(a,b,c){m(a)||xa("Expected string but got %s: %s.",[ca(a),a],b,Array.prototype.slice.call(arguments,
2))},Ba=function(a,b,c){n(a)||xa("Expected function but got %s: %s.",[ca(a),a],b,Array.prototype.slice.call(arguments,2))};var Ca=Array.prototype.indexOf?function(a,b,c){v(null!=a.length);return Array.prototype.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(m(a))return m(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},w=Array.prototype.forEach?function(a,b,c){v(null!=a.length);Array.prototype.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=m(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},Da=function(a,b){for(var c=m(a)?
a.split(""):a,d=a.length-1;0<=d;--d)d in c&&b.call(void 0,c[d],d,a)},Ea=Array.prototype.map?function(a,b,c){v(null!=a.length);return Array.prototype.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=m(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e},Fa=Array.prototype.some?function(a,b,c){v(null!=a.length);return Array.prototype.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=m(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1},
Ha=function(a){var b;a:{b=Ga;for(var c=a.length,d=m(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:m(a)?a.charAt(b):a[b]},Ia=function(a,b){return 0<=Ca(a,b)},Ka=function(a,b){var c=Ca(a,b),d;(d=0<=c)&&Ja(a,c);return d},Ja=function(a,b){v(null!=a.length);return 1==Array.prototype.splice.call(a,b,1).length},La=function(a,b){var c=0;Da(a,function(d,e){b.call(void 0,d,e,a)&&Ja(a,e)&&c++})},Ma=function(a){return Array.prototype.concat.apply(Array.prototype,
arguments)},Na=function(a){return Array.prototype.concat.apply(Array.prototype,arguments)},Oa=function(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]},Pa=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(fa(d)){var e=a.length||0,f=d.length||0;a.length=e+f;for(var g=0;g<f;g++)a[e+g]=d[g]}else a.push(d)}};var Qa=function(a,b){for(var c in a)b.call(void 0,a[c],c,a)},Ra=function(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b},Sa=function(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b},Ta=function(a){for(var b in a)return!1;return!0},Ua=function(a,b){for(var c in a)if(!(c in b)||a[c]!==b[c])return!1;for(c in b)if(!(c in a))return!1;return!0},Xa=function(a){var b={},c;for(c in a)b[c]=a[c];return b},Ya="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),
Za=function(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<Ya.length;f++)c=Ya[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};var $a;a:{var ab=l.navigator;if(ab){var bb=ab.userAgent;if(bb){$a=bb;break a}}$a=""}var x=function(a){return u($a,a)};var cb=x("Opera"),y=x("Trident")||x("MSIE"),db=x("Edge"),eb=db||y,fb=x("Gecko")&&!(u($a.toLowerCase(),"webkit")&&!x("Edge"))&&!(x("Trident")||x("MSIE"))&&!x("Edge"),gb=u($a.toLowerCase(),"webkit")&&!x("Edge"),hb=function(){var a=l.document;return a?a.documentMode:void 0},ib;
a:{var jb="",kb=function(){var a=$a;if(fb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(db)return/Edge\/([\d\.]+)/.exec(a);if(y)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(gb)return/WebKit\/(\S+)/.exec(a);if(cb)return/(?:Version)[ \/]?(\S+)/.exec(a)}();kb&&(jb=kb?kb[1]:"");if(y){var lb=hb();if(null!=lb&&lb>parseFloat(jb)){ib=String(lb);break a}}ib=jb}
var mb=ib,nb={},z=function(a){var b;if(!(b=nb[a])){b=0;for(var c=na(String(mb)).split("."),d=na(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",k=d[f]||"",p=RegExp("(\\d*)(\\D*)","g"),Y=RegExp("(\\d*)(\\D*)","g");do{var Va=p.exec(g)||["","",""],Wa=Y.exec(k)||["","",""];if(0==Va[0].length&&0==Wa[0].length)break;b=va(0==Va[1].length?0:parseInt(Va[1],10),0==Wa[1].length?0:parseInt(Wa[1],10))||va(0==Va[2].length,0==Wa[2].length)||va(Va[2],Wa[2])}while(0==b)}b=nb[a]=
0<=b}return b},ob=l.document,pb=ob&&y?hb()||("CSS1Compat"==ob.compatMode?parseInt(mb,10):5):void 0;var qb=null,rb=null,tb=function(a){var b="";sb(a,function(a){b+=String.fromCharCode(a)});return b},sb=function(a,b){function c(b){for(;d<a.length;){var c=a.charAt(d++),e=rb[c];if(null!=e)return e;if(!/^[\s\xa0]*$/.test(c))throw Error("Unknown base64 encoding at char: "+c);}return b}ub();for(var d=0;;){var e=c(-1),f=c(0),g=c(64),k=c(64);if(64===k&&-1===e)break;b(e<<2|f>>4);64!=g&&(b(f<<4&240|g>>2),64!=k&&b(g<<6&192|k))}},ub=function(){if(!qb){qb={};rb={};for(var a=0;65>a;a++)qb[a]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a),
rb[qb[a]]=a,62<=a&&(rb["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(a)]=a)}};var wb=function(){this.Wb="";this.Ed=vb};wb.prototype.pc=!0;wb.prototype.nc=function(){return this.Wb};wb.prototype.toString=function(){return"Const{"+this.Wb+"}"};var xb=function(a){if(a instanceof wb&&a.constructor===wb&&a.Ed===vb)return a.Wb;ya("expected object of type Const, got '"+a+"'");return"type_error:Const"},vb={};var A=function(){this.ea="";this.Dd=yb};A.prototype.pc=!0;A.prototype.nc=function(){return this.ea};A.prototype.toString=function(){return"SafeUrl{"+this.ea+"}"};
var zb=function(a){if(a instanceof A&&a.constructor===A&&a.Dd===yb)return a.ea;ya("expected object of type SafeUrl, got '"+a+"' of type "+ca(a));return"type_error:SafeUrl"},Ab=/^(?:(?:https?|mailto|ftp):|[^&:/?#]*(?:[/?#]|$))/i,Cb=function(a){if(a instanceof A)return a;a=a.pc?a.nc():String(a);Ab.test(a)||(a="about:invalid#zClosurez");return Bb(a)},yb={},Bb=function(a){var b=new A;b.ea=a;return b};Bb("about:blank");var Eb=function(){this.ea="";this.Cd=Db};Eb.prototype.pc=!0;Eb.prototype.nc=function(){return this.ea};Eb.prototype.toString=function(){return"SafeHtml{"+this.ea+"}"};var Fb=function(a){if(a instanceof Eb&&a.constructor===Eb&&a.Cd===Db)return a.ea;ya("expected object of type SafeHtml, got '"+a+"' of type "+ca(a));return"type_error:SafeHtml"},Db={};Eb.prototype.he=function(a){this.ea=a;return this};var Gb=function(a,b){var c;c=b instanceof A?b:Cb(b);a.href=zb(c)};var Hb=function(a){Hb[" "](a);return a};Hb[" "]=ba;var Ib=!y||9<=Number(pb),Jb=y&&!z("9");!gb||z("528");fb&&z("1.9b")||y&&z("8")||cb&&z("9.5")||gb&&z("528");fb&&!z("8")||y&&z("9");var Kb=function(){this.va=this.va;this.Lb=this.Lb};Kb.prototype.va=!1;Kb.prototype.isDisposed=function(){return this.va};Kb.prototype.Ka=function(){if(this.Lb)for(;this.Lb.length;)this.Lb.shift()()};var Lb=function(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.Ta=!1;this.od=!0};Lb.prototype.preventDefault=function(){this.defaultPrevented=!0;this.od=!1};var Mb=function(a,b){Lb.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Bb=this.state=null;a&&this.init(a,b)};r(Mb,Lb);
Mb.prototype.init=function(a,b){var c=this.type=a.type,d=a.changedTouches?a.changedTouches[0]:null;this.target=a.target||a.srcElement;this.currentTarget=b;var e=a.relatedTarget;if(e){if(fb){var f;a:{try{Hb(e.nodeName);f=!0;break a}catch(g){}f=!1}f||(e=null)}}else"mouseover"==c?e=a.fromElement:"mouseout"==c&&(e=a.toElement);this.relatedTarget=e;null===d?(this.offsetX=gb||void 0!==a.offsetX?a.offsetX:a.layerX,this.offsetY=gb||void 0!==a.offsetY?a.offsetY:a.layerY,this.clientX=void 0!==a.clientX?a.clientX:
a.pageX,this.clientY=void 0!==a.clientY?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0):(this.clientX=void 0!==d.clientX?d.clientX:d.pageX,this.clientY=void 0!==d.clientY?d.clientY:d.pageY,this.screenX=d.screenX||0,this.screenY=d.screenY||0);this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;this.metaKey=a.metaKey;this.state=a.state;this.Bb=a;a.defaultPrevented&&
this.preventDefault()};Mb.prototype.preventDefault=function(){Mb.Ic.preventDefault.call(this);var a=this.Bb;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,Jb)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var Nb="closure_listenable_"+(1E6*Math.random()|0),Ob=0;var Pb=function(a,b,c,d,e){this.listener=a;this.Nb=null;this.src=b;this.type=c;this.xb=!!d;this.Gb=e;this.key=++Ob;this.Xa=this.wb=!1},Qb=function(a){a.Xa=!0;a.listener=null;a.Nb=null;a.src=null;a.Gb=null};var Rb=function(a){this.src=a;this.v={};this.vb=0};Rb.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.v[f];a||(a=this.v[f]=[],this.vb++);var g=Sb(a,b,d,e);-1<g?(b=a[g],c||(b.wb=!1)):(b=new Pb(b,this.src,f,!!d,e),b.wb=c,a.push(b));return b};Rb.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.v))return!1;var e=this.v[a];b=Sb(e,b,c,d);return-1<b?(Qb(e[b]),Ja(e,b),0==e.length&&(delete this.v[a],this.vb--),!0):!1};
var Tb=function(a,b){var c=b.type;c in a.v&&Ka(a.v[c],b)&&(Qb(b),0==a.v[c].length&&(delete a.v[c],a.vb--))};Rb.prototype.mc=function(a,b,c,d){a=this.v[a.toString()];var e=-1;a&&(e=Sb(a,b,c,d));return-1<e?a[e]:null};var Sb=function(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.Xa&&f.listener==b&&f.xb==!!c&&f.Gb==d)return e}return-1};var Ub="closure_lm_"+(1E6*Math.random()|0),Vb={},Wb=0,Xb=function(a,b,c,d,e){if(ea(b))for(var f=0;f<b.length;f++)Xb(a,b[f],c,d,e);else c=Yb(c),a&&a[Nb]?a.listen(b,c,d,e):Zb(a,b,c,!1,d,e)},Zb=function(a,b,c,d,e,f){if(!b)throw Error("Invalid event type");var g=!!e,k=$b(a);k||(a[Ub]=k=new Rb(a));c=k.add(b,c,d,e,f);if(c.Nb)return;d=ac();c.Nb=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,g);else if(a.attachEvent)a.attachEvent(bc(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");
Wb++},ac=function(){var a=cc,b=Ib?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b},dc=function(a,b,c,d,e){if(ea(b))for(var f=0;f<b.length;f++)dc(a,b[f],c,d,e);else c=Yb(c),a&&a[Nb]?ec(a,b,c,d,e):Zb(a,b,c,!0,d,e)},fc=function(a,b,c,d,e){if(ea(b))for(var f=0;f<b.length;f++)fc(a,b[f],c,d,e);else c=Yb(c),a&&a[Nb]?a.V.remove(String(b),c,d,e):a&&(a=$b(a))&&(b=a.mc(b,c,!!d,e))&&gc(b)},gc=function(a){if(!ga(a)&&a&&!a.Xa){var b=a.src;if(b&&b[Nb])Tb(b.V,
a);else{var c=a.type,d=a.Nb;b.removeEventListener?b.removeEventListener(c,d,a.xb):b.detachEvent&&b.detachEvent(bc(c),d);Wb--;(c=$b(b))?(Tb(c,a),0==c.vb&&(c.src=null,b[Ub]=null)):Qb(a)}}},bc=function(a){return a in Vb?Vb[a]:Vb[a]="on"+a},ic=function(a,b,c,d){var e=!0;if(a=$b(a))if(b=a.v[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.xb==c&&!f.Xa&&(f=hc(f,d),e=e&&!1!==f)}return e},hc=function(a,b){var c=a.listener,d=a.Gb||a.src;a.wb&&gc(a);return c.call(d,b)},cc=function(a,b){if(a.Xa)return!0;
if(!Ib){var c;if(!(c=b))a:{c=["window","event"];for(var d=l,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new Mb(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(p){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,g=e.length-1;!c.Ta&&0<=g;g--){c.currentTarget=e[g];var k=ic(e[g],f,!0,c),d=d&&k}for(g=0;!c.Ta&&g<e.length;g++)c.currentTarget=e[g],
k=ic(e[g],f,!1,c),d=d&&k}return d}return hc(a,new Mb(b,this))},$b=function(a){a=a[Ub];return a instanceof Rb?a:null},jc="__closure_events_fn_"+(1E9*Math.random()>>>0),Yb=function(a){v(a,"Listener can not be null.");if(n(a))return a;v(a.handleEvent,"An object listener must have handleEvent method.");a[jc]||(a[jc]=function(b){return a.handleEvent(b)});return a[jc]};var kc=/^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;var lc=function(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/(?:"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)[\s\u2028\u2029]*(?=:|,|]|}|$)/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);},oc=function(a){var b=[];mc(new nc,a,b);return b.join("")},nc=function(){this.Qb=void 0},mc=function(a,b,c){if(null==
b)c.push("null");else{if("object"==typeof b){if(ea(b)){var d=b;b=d.length;c.push("[");for(var e="",f=0;f<b;f++)c.push(e),e=d[f],mc(a,a.Qb?a.Qb.call(d,String(f),e):e,c),e=",";c.push("]");return}if(b instanceof String||b instanceof Number||b instanceof Boolean)b=b.valueOf();else{c.push("{");f="";for(d in b)Object.prototype.hasOwnProperty.call(b,d)&&(e=b[d],"function"!=typeof e&&(c.push(f),pc(d,c),c.push(":"),mc(a,a.Qb?a.Qb.call(b,d,e):e,c),f=","));c.push("}");return}}switch(typeof b){case "string":pc(b,
c);break;case "number":c.push(isFinite(b)&&!isNaN(b)?String(b):"null");break;case "boolean":c.push(String(b));break;case "function":c.push("null");break;default:throw Error("Unknown type: "+typeof b);}}},qc={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"},rc=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g,pc=function(a,b){b.push('"',a.replace(rc,function(a){var b=qc[a];b||(b="\\u"+(a.charCodeAt(0)|65536).toString(16).substr(1),
qc[a]=b);return b}),'"')};var sc=function(){};sc.prototype.Lc=null;var tc=function(a){return a.Lc||(a.Lc=a.sc())};var uc,vc=function(){};r(vc,sc);vc.prototype.yb=function(){var a=wc(this);return a?new ActiveXObject(a):new XMLHttpRequest};vc.prototype.sc=function(){var a={};wc(this)&&(a[0]=!0,a[1]=!0);return a};
var wc=function(a){if(!a.$c&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.$c=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.$c};uc=new vc;var xc=function(){};r(xc,sc);xc.prototype.yb=function(){var a=new XMLHttpRequest;if("withCredentials"in a)return a;if("undefined"!=typeof XDomainRequest)return new yc;throw Error("Unsupported browser");};xc.prototype.sc=function(){return{}};
var yc=function(){this.ia=new XDomainRequest;this.readyState=0;this.onreadystatechange=null;this.responseText="";this.status=-1;this.statusText=this.responseXML=null;this.ia.onload=q(this.Wd,this);this.ia.onerror=q(this.Yc,this);this.ia.onprogress=q(this.Xd,this);this.ia.ontimeout=q(this.Yd,this)};h=yc.prototype;h.open=function(a,b,c){if(null!=c&&!c)throw Error("Only async requests are supported.");this.ia.open(a,b)};
h.send=function(a){if(a)if("string"==typeof a)this.ia.send(a);else throw Error("Only string data is supported");else this.ia.send()};h.abort=function(){this.ia.abort()};h.setRequestHeader=function(){};h.Wd=function(){this.status=200;this.responseText=this.ia.responseText;zc(this,4)};h.Yc=function(){this.status=500;this.responseText="";zc(this,4)};h.Yd=function(){this.Yc()};h.Xd=function(){this.status=200;zc(this,1)};var zc=function(a,b){a.readyState=b;if(a.onreadystatechange)a.onreadystatechange()};var B=function(a,b){this.h=[];this.g=b;for(var c=!0,d=a.length-1;0<=d;d--){var e=a[d]|0;c&&e==b||(this.h[d]=e,c=!1)}},Ac={},Bc=function(a){if(-128<=a&&128>a){var b=Ac[a];if(b)return b}b=new B([a|0],0>a?-1:0);-128<=a&&128>a&&(Ac[a]=b);return b},E=function(a){if(isNaN(a)||!isFinite(a))return C;if(0>a)return D(E(-a));for(var b=[],c=1,d=0;a>=c;d++)b[d]=a/c|0,c*=4294967296;return new B(b,0)},Cc=function(a,b){if(0==a.length)throw Error("number format error: empty string");var c=b||10;if(2>c||36<c)throw Error("radix out of range: "+
c);if("-"==a.charAt(0))return D(Cc(a.substring(1),c));if(0<=a.indexOf("-"))throw Error('number format error: interior "-" character');for(var d=E(Math.pow(c,8)),e=C,f=0;f<a.length;f+=8){var g=Math.min(8,a.length-f),k=parseInt(a.substring(f,f+g),c);8>g?(g=E(Math.pow(c,g)),e=e.multiply(g).add(E(k))):(e=e.multiply(d),e=e.add(E(k)))}return e},C=Bc(0),Dc=Bc(1),Ec=Bc(16777216),Fc=function(a){if(-1==a.g)return-Fc(D(a));for(var b=0,c=1,d=0;d<a.h.length;d++)b+=Gc(a,d)*c,c*=4294967296;return b};
B.prototype.toString=function(a){a=a||10;if(2>a||36<a)throw Error("radix out of range: "+a);if(F(this))return"0";if(-1==this.g)return"-"+D(this).toString(a);for(var b=E(Math.pow(a,6)),c=this,d="";;){var e=Hc(c,b),c=Ic(c,e.multiply(b)),f=((0<c.h.length?c.h[0]:c.g)>>>0).toString(a),c=e;if(F(c))return f+d;for(;6>f.length;)f="0"+f;d=""+f+d}};
var G=function(a,b){return 0>b?0:b<a.h.length?a.h[b]:a.g},Gc=function(a,b){var c=G(a,b);return 0<=c?c:4294967296+c},F=function(a){if(0!=a.g)return!1;for(var b=0;b<a.h.length;b++)if(0!=a.h[b])return!1;return!0};B.prototype.Ab=function(a){if(this.g!=a.g)return!1;for(var b=Math.max(this.h.length,a.h.length),c=0;c<b;c++)if(G(this,c)!=G(a,c))return!1;return!0};B.prototype.compare=function(a){a=Ic(this,a);return-1==a.g?-1:F(a)?0:1};
var D=function(a){for(var b=a.h.length,c=[],d=0;d<b;d++)c[d]=~a.h[d];return(new B(c,~a.g)).add(Dc)};B.prototype.add=function(a){for(var b=Math.max(this.h.length,a.h.length),c=[],d=0,e=0;e<=b;e++){var f=d+(G(this,e)&65535)+(G(a,e)&65535),g=(f>>>16)+(G(this,e)>>>16)+(G(a,e)>>>16),d=g>>>16,f=f&65535,g=g&65535;c[e]=g<<16|f}return new B(c,c[c.length-1]&-2147483648?-1:0)};var Ic=function(a,b){return a.add(D(b))};
B.prototype.multiply=function(a){if(F(this)||F(a))return C;if(-1==this.g)return-1==a.g?D(this).multiply(D(a)):D(D(this).multiply(a));if(-1==a.g)return D(this.multiply(D(a)));if(0>this.compare(Ec)&&0>a.compare(Ec))return E(Fc(this)*Fc(a));for(var b=this.h.length+a.h.length,c=[],d=0;d<2*b;d++)c[d]=0;for(d=0;d<this.h.length;d++)for(var e=0;e<a.h.length;e++){var f=G(this,d)>>>16,g=G(this,d)&65535,k=G(a,e)>>>16,p=G(a,e)&65535;c[2*d+2*e]+=g*p;Jc(c,2*d+2*e);c[2*d+2*e+1]+=f*p;Jc(c,2*d+2*e+1);c[2*d+2*e+1]+=
g*k;Jc(c,2*d+2*e+1);c[2*d+2*e+2]+=f*k;Jc(c,2*d+2*e+2)}for(d=0;d<b;d++)c[d]=c[2*d+1]<<16|c[2*d];for(d=b;d<2*b;d++)c[d]=0;return new B(c,0)};
var Jc=function(a,b){for(;(a[b]&65535)!=a[b];)a[b+1]+=a[b]>>>16,a[b]&=65535},Hc=function(a,b){if(F(b))throw Error("division by zero");if(F(a))return C;if(-1==a.g)return-1==b.g?Hc(D(a),D(b)):D(Hc(D(a),b));if(-1==b.g)return D(Hc(a,D(b)));if(30<a.h.length){if(-1==a.g||-1==b.g)throw Error("slowDivide_ only works with positive integers.");for(var c=Dc,d=b;0>=d.compare(a);)c=c.shiftLeft(1),d=d.shiftLeft(1);for(var e=Kc(c,1),f=Kc(d,1),g,d=Kc(d,2),c=Kc(c,2);!F(d);)g=f.add(d),0>=g.compare(a)&&(e=e.add(c),
f=g),d=Kc(d,1),c=Kc(c,1);return e}c=C;for(d=a;0<=d.compare(b);){e=Math.max(1,Math.floor(Fc(d)/Fc(b)));f=Math.ceil(Math.log(e)/Math.LN2);f=48>=f?1:Math.pow(2,f-48);g=E(e);for(var k=g.multiply(b);-1==k.g||0<k.compare(d);)e-=f,g=E(e),k=g.multiply(b);F(g)&&(g=Dc);c=c.add(g);d=Ic(d,k)}return c},Lc=function(a,b){for(var c=Math.max(a.h.length,b.h.length),d=[],e=0;e<c;e++)d[e]=G(a,e)|G(b,e);return new B(d,a.g|b.g)};
B.prototype.shiftLeft=function(a){var b=a>>5;a%=32;for(var c=this.h.length+b+(0<a?1:0),d=[],e=0;e<c;e++)d[e]=0<a?G(this,e-b)<<a|G(this,e-b-1)>>>32-a:G(this,e-b);return new B(d,this.g)};var Kc=function(a,b){for(var c=b>>5,d=b%32,e=a.h.length-c,f=[],g=0;g<e;g++)f[g]=0<d?G(a,g+c)>>>d|G(a,g+c+1)<<32-d:G(a,g+c);return new B(f,a.g)};var Mc=function(a,b){this.lb=a;this.ha=b};Mc.prototype.Ab=function(a){return this.ha==a.ha&&this.lb.Ab(Xa(a.lb))};
var Pc=function(a){try{var b;if(b=0==a.lastIndexOf("[",0)){var c=a.length-1;b=0<=c&&a.indexOf("]",c)==c}return b?new Nc(a.substring(1,a.length-1)):new Oc(a)}catch(d){return null}},Oc=function(a){var b=C;if(a instanceof B){if(0!=a.g||0>a.compare(C)||0<a.compare(Qc))throw Error("The address does not look like an IPv4.");b=Xa(a)}else{if(!Rc.test(a))throw Error(a+" does not look like an IPv4 address.");var c=a.split(".");if(4!=c.length)throw Error(a+" does not look like an IPv4 address.");for(var d=0;d<
c.length;d++){var e;e=c[d];var f=Number(e);e=0==f&&/^[\s\xa0]*$/.test(e)?NaN:f;if(isNaN(e)||0>e||255<e||1!=c[d].length&&0==c[d].lastIndexOf("0",0))throw Error("In "+a+", octet "+d+" is not valid");e=E(e);b=Lc(b.shiftLeft(8),e)}}Mc.call(this,b,4)};r(Oc,Mc);var Rc=/^[0-9.]*$/,Qc=Ic(Dc.shiftLeft(32),Dc);Oc.prototype.toString=function(){if(this.za)return this.za;for(var a=Gc(this.lb,0),b=[],c=3;0<=c;c--)b[c]=String(a&255),a>>>=8;return this.za=b.join(".")};
var Nc=function(a){var b=C;if(a instanceof B){if(0!=a.g||0>a.compare(C)||0<a.compare(Sc))throw Error("The address does not look like a valid IPv6.");b=Xa(a)}else{if(!Tc.test(a))throw Error(a+" is not a valid IPv6 address.");var c=a.split(":");if(-1!=c[c.length-1].indexOf(".")){a=Gc(Xa((new Oc(c[c.length-1])).lb),0);var d=[];d.push((a>>>16&65535).toString(16));d.push((a&65535).toString(16));Ja(c,c.length-1);Pa(c,d);a=c.join(":")}d=a.split("::");if(2<d.length||1==d.length&&8!=c.length)throw Error(a+
" is not a valid IPv6 address.");if(1<d.length){c=d[0].split(":");d=d[1].split(":");1==c.length&&""==c[0]&&(c=[]);1==d.length&&""==d[0]&&(d=[]);var e=8-(c.length+d.length);if(1>e)c=[];else{for(var f=[],g=0;g<e;g++)f[g]="0";c=Na(c,f,d)}}if(8!=c.length)throw Error(a+" is not a valid IPv6 address");for(d=0;d<c.length;d++){e=Cc(c[d],16);if(0>e.compare(C)||0<e.compare(Uc))throw Error(c[d]+" in "+a+" is not a valid hextet.");b=Lc(b.shiftLeft(16),e)}}Mc.call(this,b,6)};r(Nc,Mc);
var Tc=/^([a-fA-F0-9]*:){2}[a-fA-F0-9:.]*$/,Uc=Bc(65535),Sc=Ic(Dc.shiftLeft(128),Dc);Nc.prototype.toString=function(){if(this.za)return this.za;for(var a=[],b=3;0<=b;b--){var c=Gc(this.lb,b),d=c&65535;a.push((c>>>16).toString(16));a.push(d.toString(16))}for(var c=b=-1,e=d=0,f=0;f<a.length;f++)"0"==a[f]?(e++,-1==c&&(c=f),e>d&&(d=e,b=c)):(c=-1,e=0);0<d&&(b+d==a.length&&a.push(""),a.splice(b,d,""),0==b&&(a=[""].concat(a)));return this.za=a.join(":")};!fb&&!y||y&&9<=Number(pb)||fb&&z("1.9.1");y&&z("9");var Wc=function(a,b){Qa(b,function(b,d){"style"==d?a.style.cssText=b:"class"==d?a.className=b:"for"==d?a.htmlFor=b:Vc.hasOwnProperty(d)?a.setAttribute(Vc[d],b):0==d.lastIndexOf("aria-",0)||0==d.lastIndexOf("data-",0)?a.setAttribute(d,b):a[d]=b})},Vc={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",frameborder:"frameBorder",height:"height",maxlength:"maxLength",nonce:"nonce",role:"role",rowspan:"rowSpan",type:"type",usemap:"useMap",valign:"vAlign",width:"width"};var Xc=function(a,b,c){this.je=c;this.Ld=a;this.ve=b;this.Kb=0;this.Hb=null};Xc.prototype.get=function(){var a;0<this.Kb?(this.Kb--,a=this.Hb,this.Hb=a.next,a.next=null):a=this.Ld();return a};Xc.prototype.put=function(a){this.ve(a);this.Kb<this.je&&(this.Kb++,a.next=this.Hb,this.Hb=a)};var Yc=function(a){l.setTimeout(function(){throw a;},0)},Zc,$c=function(){var a=l.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&!x("Presto")&&(a=function(){var a=document.createElement("IFRAME");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+"//"+b.location.host,
a=q(function(a){if(("*"==d||a.origin==d)&&a.data==c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&!x("Trident")&&!x("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(void 0!==c.next){c=c.next;var a=c.Pc;c.Pc=null;a()}};return function(a){d.next={Pc:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("SCRIPT")?
function(a){var b=document.createElement("SCRIPT");b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){l.setTimeout(a,0)}};var ad=function(){this.ac=this.Ha=null},cd=new Xc(function(){return new bd},function(a){a.reset()},100);ad.prototype.add=function(a,b){var c=cd.get();c.set(a,b);this.ac?this.ac.next=c:(v(!this.Ha),this.Ha=c);this.ac=c};ad.prototype.remove=function(){var a=null;this.Ha&&(a=this.Ha,this.Ha=this.Ha.next,this.Ha||(this.ac=null),a.next=null);return a};var bd=function(){this.next=this.scope=this.lc=null};bd.prototype.set=function(a,b){this.lc=a;this.scope=b;this.next=null};
bd.prototype.reset=function(){this.next=this.scope=this.lc=null};var hd=function(a,b){dd||ed();fd||(dd(),fd=!0);gd.add(a,b)},dd,ed=function(){if(l.Promise&&l.Promise.resolve){var a=l.Promise.resolve(void 0);dd=function(){a.then(id)}}else dd=function(){var a=id;!n(l.setImmediate)||l.Window&&l.Window.prototype&&!x("Edge")&&l.Window.prototype.setImmediate==l.setImmediate?(Zc||(Zc=$c()),Zc(a)):l.setImmediate(a)}},fd=!1,gd=new ad,id=function(){for(var a;a=gd.remove();){try{a.lc.call(a.scope)}catch(b){Yc(b)}cd.put(a)}fd=!1};var jd=function(a){a.prototype.then=a.prototype.then;a.prototype.$goog_Thenable=!0},kd=function(a){if(!a)return!1;try{return!!a.$goog_Thenable}catch(b){return!1}};var H=function(a,b){this.D=0;this.ga=void 0;this.Ja=this.ba=this.l=null;this.Fb=this.kc=!1;if(a!=ba)try{var c=this;a.call(b,function(a){ld(c,2,a)},function(a){if(!(a instanceof md))try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}ld(c,3,a)})}catch(d){ld(this,3,d)}},nd=function(){this.next=this.context=this.Pa=this.Aa=this.child=null;this.eb=!1};nd.prototype.reset=function(){this.context=this.Pa=this.Aa=this.child=null;this.eb=!1};
var od=new Xc(function(){return new nd},function(a){a.reset()},100),pd=function(a,b,c){var d=od.get();d.Aa=a;d.Pa=b;d.context=c;return d},I=function(a){if(a instanceof H)return a;var b=new H(ba);ld(b,2,a);return b},J=function(a){return new H(function(b,c){c(a)})},rd=function(a,b,c){qd(a,b,c,null)||hd(ka(b,a))},sd=function(a){return new H(function(b){var c=a.length,d=[];if(c)for(var e=function(a,e,f){c--;d[a]=e?{Ud:!0,value:f}:{Ud:!1,reason:f};0==c&&b(d)},f=0,g;f<a.length;f++)g=a[f],rd(g,ka(e,f,!0),
ka(e,f,!1));else b(d)})};H.prototype.then=function(a,b,c){null!=a&&Ba(a,"opt_onFulfilled should be a function.");null!=b&&Ba(b,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?");return td(this,n(a)?a:null,n(b)?b:null,c)};jd(H);var vd=function(a,b){var c=pd(b,b,void 0);c.eb=!0;ud(a,c);return a};H.prototype.F=function(a,b){return td(this,null,a,b)};H.prototype.cancel=function(a){0==this.D&&hd(function(){var b=new md(a);wd(this,b)},this)};
var wd=function(a,b){if(0==a.D)if(a.l){var c=a.l;if(c.ba){for(var d=0,e=null,f=null,g=c.ba;g&&(g.eb||(d++,g.child==a&&(e=g),!(e&&1<d)));g=g.next)e||(f=g);e&&(0==c.D&&1==d?wd(c,b):(f?(d=f,v(c.ba),v(null!=d),d.next==c.Ja&&(c.Ja=d),d.next=d.next.next):xd(c),yd(c,e,3,b)))}a.l=null}else ld(a,3,b)},ud=function(a,b){a.ba||2!=a.D&&3!=a.D||zd(a);v(null!=b.Aa);a.Ja?a.Ja.next=b:a.ba=b;a.Ja=b},td=function(a,b,c,d){var e=pd(null,null,null);e.child=new H(function(a,g){e.Aa=b?function(c){try{var e=b.call(d,c);a(e)}catch(Y){g(Y)}}:
a;e.Pa=c?function(b){try{var e=c.call(d,b);void 0===e&&b instanceof md?g(b):a(e)}catch(Y){g(Y)}}:g});e.child.l=a;ud(a,e);return e.child};H.prototype.Ee=function(a){v(1==this.D);this.D=0;ld(this,2,a)};H.prototype.Fe=function(a){v(1==this.D);this.D=0;ld(this,3,a)};
var ld=function(a,b,c){0==a.D&&(a===c&&(b=3,c=new TypeError("Promise cannot resolve to itself")),a.D=1,qd(c,a.Ee,a.Fe,a)||(a.ga=c,a.D=b,a.l=null,zd(a),3!=b||c instanceof md||Ad(a,c)))},qd=function(a,b,c,d){if(a instanceof H)return null!=b&&Ba(b,"opt_onFulfilled should be a function."),null!=c&&Ba(c,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?"),ud(a,pd(b||ba,c||null,d)),!0;if(kd(a))return a.then(b,c,d),!0;if(ha(a))try{var e=a.then;if(n(e))return Bd(a,
e,b,c,d),!0}catch(f){return c.call(d,f),!0}return!1},Bd=function(a,b,c,d,e){var f=!1,g=function(a){f||(f=!0,c.call(e,a))},k=function(a){f||(f=!0,d.call(e,a))};try{b.call(a,g,k)}catch(p){k(p)}},zd=function(a){a.kc||(a.kc=!0,hd(a.Pd,a))},xd=function(a){var b=null;a.ba&&(b=a.ba,a.ba=b.next,b.next=null);a.ba||(a.Ja=null);null!=b&&v(null!=b.Aa);return b};H.prototype.Pd=function(){for(var a;a=xd(this);)yd(this,a,this.D,this.ga);this.kc=!1};
var yd=function(a,b,c,d){if(3==c&&b.Pa&&!b.eb)for(;a&&a.Fb;a=a.l)a.Fb=!1;if(b.child)b.child.l=null,Cd(b,c,d);else try{b.eb?b.Aa.call(b.context):Cd(b,c,d)}catch(e){Dd.call(null,e)}od.put(b)},Cd=function(a,b,c){2==b?a.Aa.call(a.context,c):a.Pa&&a.Pa.call(a.context,c)},Ad=function(a,b){a.Fb=!0;hd(function(){a.Fb&&Dd.call(null,b)})},Dd=Yc,md=function(a){t.call(this,a)};r(md,t);md.prototype.name="cancel";/*
 Portions of this code are from MochiKit, received by
 The Closure Authors under the MIT license. All other code is Copyright
 2005-2009 The Closure Authors. All Rights Reserved.
*/
var Ed=function(a,b){this.Sb=[];this.hd=a;this.Rc=b||null;this.ib=this.Ma=!1;this.ga=void 0;this.Gc=this.Kc=this.ec=!1;this.Zb=0;this.l=null;this.fc=0};Ed.prototype.cancel=function(a){if(this.Ma)this.ga instanceof Ed&&this.ga.cancel();else{if(this.l){var b=this.l;delete this.l;a?b.cancel(a):(b.fc--,0>=b.fc&&b.cancel())}this.hd?this.hd.call(this.Rc,this):this.Gc=!0;this.Ma||Fd(this,new Gd)}};Ed.prototype.Qc=function(a,b){this.ec=!1;Hd(this,a,b)};
var Hd=function(a,b,c){a.Ma=!0;a.ga=c;a.ib=!b;Id(a)},Kd=function(a){if(a.Ma){if(!a.Gc)throw new Jd;a.Gc=!1}};Ed.prototype.callback=function(a){Kd(this);Ld(a);Hd(this,!0,a)};var Fd=function(a,b){Kd(a);Ld(b);Hd(a,!1,b)},Ld=function(a){v(!(a instanceof Ed),"An execution sequence may not be initiated with a blocking Deferred.")},Nd=function(a,b){Md(a,null,b,void 0)},Md=function(a,b,c,d){v(!a.Kc,"Blocking Deferreds can not be re-used");a.Sb.push([b,c,d]);a.Ma&&Id(a)};
Ed.prototype.then=function(a,b,c){var d,e,f=new H(function(a,b){d=a;e=b});Md(this,d,function(a){a instanceof Gd?f.cancel():e(a)});return f.then(a,b,c)};jd(Ed);
var Od=function(a){return Fa(a.Sb,function(a){return n(a[1])})},Id=function(a){if(a.Zb&&a.Ma&&Od(a)){var b=a.Zb,c=Pd[b];c&&(l.clearTimeout(c.jb),delete Pd[b]);a.Zb=0}a.l&&(a.l.fc--,delete a.l);for(var b=a.ga,d=c=!1;a.Sb.length&&!a.ec;){var e=a.Sb.shift(),f=e[0],g=e[1],e=e[2];if(f=a.ib?g:f)try{var k=f.call(e||a.Rc,b);void 0!==k&&(a.ib=a.ib&&(k==b||k instanceof Error),a.ga=b=k);if(kd(b)||"function"===typeof l.Promise&&b instanceof l.Promise)d=!0,a.ec=!0}catch(p){b=p,a.ib=!0,Od(a)||(c=!0)}}a.ga=b;d&&
(k=q(a.Qc,a,!0),d=q(a.Qc,a,!1),b instanceof Ed?(Md(b,k,d),b.Kc=!0):b.then(k,d));c&&(b=new Qd(b),Pd[b.jb]=b,a.Zb=b.jb)},Jd=function(){t.call(this)};r(Jd,t);Jd.prototype.message="Deferred has already fired";Jd.prototype.name="AlreadyCalledError";var Gd=function(){t.call(this)};r(Gd,t);Gd.prototype.message="Deferred was canceled";Gd.prototype.name="CanceledError";var Qd=function(a){this.jb=l.setTimeout(q(this.De,this),0);this.I=a};
Qd.prototype.De=function(){v(Pd[this.jb],"Cannot throw an error that is not scheduled.");delete Pd[this.jb];throw this.I;};var Pd={};var Vd=function(a){var b={},c=b.document||document,d=document.createElement("SCRIPT"),e={pd:d,ub:void 0},f=new Ed(Rd,e),g=null,k=null!=b.timeout?b.timeout:5E3;0<k&&(g=window.setTimeout(function(){Sd(d,!0);Fd(f,new Td(1,"Timeout reached for loading script "+a))},k),e.ub=g);d.onload=d.onreadystatechange=function(){d.readyState&&"loaded"!=d.readyState&&"complete"!=d.readyState||(Sd(d,b.Le||!1,g),f.callback(null))};d.onerror=function(){Sd(d,!0,g);Fd(f,new Td(0,"Error while loading script "+a))};e=b.attributes||
{};Za(e,{type:"text/javascript",charset:"UTF-8",src:a});Wc(d,e);Ud(c).appendChild(d);return f},Ud=function(a){var b=a.getElementsByTagName("HEAD");return b&&0!=b.length?b[0]:a.documentElement},Rd=function(){if(this&&this.pd){var a=this.pd;a&&"SCRIPT"==a.tagName&&Sd(a,!0,this.ub)}},Sd=function(a,b,c){null!=c&&l.clearTimeout(c);a.onload=ba;a.onerror=ba;a.onreadystatechange=ba;b&&window.setTimeout(function(){a&&a.parentNode&&a.parentNode.removeChild(a)},0)},Td=function(a,b){var c="Jsloader error (code #"+
a+")";b&&(c+=": "+b);t.call(this,c);this.code=a};r(Td,t);var Wd=function(){Kb.call(this);this.V=new Rb(this);this.Hd=this;this.vc=null};r(Wd,Kb);Wd.prototype[Nb]=!0;h=Wd.prototype;h.addEventListener=function(a,b,c,d){Xb(this,a,b,c,d)};h.removeEventListener=function(a,b,c,d){fc(this,a,b,c,d)};
h.dispatchEvent=function(a){Xd(this);var b,c=this.vc;if(c){b=[];for(var d=1;c;c=c.vc)b.push(c),v(1E3>++d,"infinite loop")}c=this.Hd;d=a.type||a;if(m(a))a=new Lb(a,c);else if(a instanceof Lb)a.target=a.target||c;else{var e=a;a=new Lb(d,c);Za(a,e)}var e=!0,f;if(b)for(var g=b.length-1;!a.Ta&&0<=g;g--)f=a.currentTarget=b[g],e=Yd(f,d,!0,a)&&e;a.Ta||(f=a.currentTarget=c,e=Yd(f,d,!0,a)&&e,a.Ta||(e=Yd(f,d,!1,a)&&e));if(b)for(g=0;!a.Ta&&g<b.length;g++)f=a.currentTarget=b[g],e=Yd(f,d,!1,a)&&e;return e};
h.Ka=function(){Wd.Ic.Ka.call(this);if(this.V){var a=this.V,b=0,c;for(c in a.v){for(var d=a.v[c],e=0;e<d.length;e++)++b,Qb(d[e]);delete a.v[c];a.vb--}}this.vc=null};h.listen=function(a,b,c,d){Xd(this);return this.V.add(String(a),b,!1,c,d)};
var ec=function(a,b,c,d,e){a.V.add(String(b),c,!0,d,e)},Yd=function(a,b,c,d){b=a.V.v[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var g=b[f];if(g&&!g.Xa&&g.xb==c){var k=g.listener,p=g.Gb||g.src;g.wb&&Tb(a.V,g);e=!1!==k.call(p,d)&&e}}return e&&0!=d.od};Wd.prototype.mc=function(a,b,c,d){return this.V.mc(String(a),b,c,d)};var Xd=function(a){v(a.V,"Event target is not initialized. Did you call the superclass (goog.events.EventTarget) constructor?")};var Zd="StopIteration"in l?l.StopIteration:{message:"StopIteration",stack:""},$d=function(){};$d.prototype.next=function(){throw Zd;};$d.prototype.Gd=function(){return this};var ae=function(a,b){this.W={};this.m=[];this.ha=this.i=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)};h=ae.prototype;h.Wc=function(){return this.i};h.R=function(){be(this);for(var a=[],b=0;b<this.m.length;b++)a.push(this.W[this.m[b]]);return a};h.ca=function(){be(this);return this.m.concat()};h.gb=function(a){return ce(this.W,a)};
h.Ab=function(a,b){if(this===a)return!0;if(this.i!=a.Wc())return!1;var c=b||de;be(this);for(var d,e=0;d=this.m[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};var de=function(a,b){return a===b};ae.prototype.remove=function(a){return ce(this.W,a)?(delete this.W[a],this.i--,this.ha++,this.m.length>2*this.i&&be(this),!0):!1};
var be=function(a){if(a.i!=a.m.length){for(var b=0,c=0;b<a.m.length;){var d=a.m[b];ce(a.W,d)&&(a.m[c++]=d);b++}a.m.length=c}if(a.i!=a.m.length){for(var e={},c=b=0;b<a.m.length;)d=a.m[b],ce(e,d)||(a.m[c++]=d,e[d]=1),b++;a.m.length=c}};h=ae.prototype;h.get=function(a,b){return ce(this.W,a)?this.W[a]:b};h.set=function(a,b){ce(this.W,a)||(this.i++,this.m.push(a),this.ha++);this.W[a]=b};
h.addAll=function(a){var b;a instanceof ae?(b=a.ca(),a=a.R()):(b=Sa(a),a=Ra(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};h.forEach=function(a,b){for(var c=this.ca(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};h.clone=function(){return new ae(this)};h.Gd=function(a){be(this);var b=0,c=this.ha,d=this,e=new $d;e.next=function(){if(c!=d.ha)throw Error("The map has changed since the iterator was created");if(b>=d.m.length)throw Zd;var e=d.m[b++];return a?e:d.W[e]};return e};
var ce=function(a,b){return Object.prototype.hasOwnProperty.call(a,b)};var ee=function(a){if(a.R&&"function"==typeof a.R)return a.R();if(m(a))return a.split("");if(fa(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Ra(a)},fe=function(a){if(a.ca&&"function"==typeof a.ca)return a.ca();if(!a.R||"function"!=typeof a.R){if(fa(a)||m(a)){var b=[];a=a.length;for(var c=0;c<a;c++)b.push(c);return b}return Sa(a)}},ge=function(a,b){if(a.forEach&&"function"==typeof a.forEach)a.forEach(b,void 0);else if(fa(a)||m(a))w(a,b,void 0);else for(var c=fe(a),d=ee(a),e=
d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)};var he=function(a,b,c,d,e){this.reset(a,b,c,d,e)};he.prototype.Tc=null;var ie=0;he.prototype.reset=function(a,b,c,d,e){"number"==typeof e||ie++;d||la();this.ob=a;this.le=b;delete this.Tc};he.prototype.sd=function(a){this.ob=a};var je=function(a){this.me=a;this.Zc=this.gc=this.ob=this.l=null},ke=function(a,b){this.name=a;this.value=b};ke.prototype.toString=function(){return this.name};var le=new ke("SEVERE",1E3),me=new ke("CONFIG",700),ne=new ke("FINE",500);je.prototype.getParent=function(){return this.l};je.prototype.sd=function(a){this.ob=a};var oe=function(a){if(a.ob)return a.ob;if(a.l)return oe(a.l);ya("Root logger has no level set.");return null};
je.prototype.log=function(a,b,c){if(a.value>=oe(this).value)for(n(b)&&(b=b()),a=new he(a,String(b),this.me),c&&(a.Tc=c),c="log:"+a.le,l.console&&(l.console.timeStamp?l.console.timeStamp(c):l.console.markTimeline&&l.console.markTimeline(c)),l.msWriteProfilerMark&&l.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Zc)for(var e=0,f;f=b.Zc[e];e++)f(d);c=c.getParent()}};
var pe={},qe=null,re=function(a){qe||(qe=new je(""),pe[""]=qe,qe.sd(me));var b;if(!(b=pe[a])){b=new je(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=re(a.substr(0,c));c.gc||(c.gc={});c.gc[d]=b;b.l=c;pe[a]=b}return b};var K=function(a,b){a&&a.log(ne,b,void 0)};var se=function(a,b,c){if(n(a))c&&(a=q(a,c));else if(a&&"function"==typeof a.handleEvent)a=q(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(b)?-1:l.setTimeout(a,b||0)},te=function(a){var b=null;return(new H(function(c,d){b=se(function(){c(void 0)},a);-1==b&&d(Error("Failed to schedule timer."))})).F(function(a){l.clearTimeout(b);throw a;})};var ue=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/,ve=function(a,b){if(a)for(var c=a.split("&"),d=0;d<c.length;d++){var e=c[d].indexOf("="),f,g=null;0<=e?(f=c[d].substring(0,e),g=c[d].substring(e+1)):f=c[d];b(f,g?decodeURIComponent(g.replace(/\+/g," ")):"")}};var L=function(a){Wd.call(this);this.headers=new ae;this.cc=a||null;this.ja=!1;this.bc=this.a=null;this.nb=this.dd=this.Jb="";this.ya=this.qc=this.Ib=this.jc=!1;this.ab=0;this.Yb=null;this.nd="";this.$b=this.te=this.yd=!1};r(L,Wd);var we=L.prototype,xe=re("goog.net.XhrIo");we.N=xe;var ye=/^https?$/i,ze=["POST","PUT"];
L.prototype.send=function(a,b,c,d){if(this.a)throw Error("[goog.net.XhrIo] Object is active with another request="+this.Jb+"; newUri="+a);b=b?b.toUpperCase():"GET";this.Jb=a;this.nb="";this.dd=b;this.jc=!1;this.ja=!0;this.a=this.cc?this.cc.yb():uc.yb();this.bc=this.cc?tc(this.cc):tc(uc);this.a.onreadystatechange=q(this.kd,this);this.te&&"onprogress"in this.a&&(this.a.onprogress=q(function(a){this.jd(a,!0)},this),this.a.upload&&(this.a.upload.onprogress=q(this.jd,this)));try{K(this.N,Ae(this,"Opening Xhr")),
this.qc=!0,this.a.open(b,String(a),!0),this.qc=!1}catch(f){K(this.N,Ae(this,"Error opening Xhr: "+f.message));this.I(5,f);return}a=c||"";var e=this.headers.clone();d&&ge(d,function(a,b){e.set(b,a)});d=Ha(e.ca());c=l.FormData&&a instanceof l.FormData;!Ia(ze,b)||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");e.forEach(function(a,b){this.a.setRequestHeader(b,a)},this);this.nd&&(this.a.responseType=this.nd);"withCredentials"in this.a&&this.a.withCredentials!==this.yd&&(this.a.withCredentials=
this.yd);try{Be(this),0<this.ab&&(this.$b=Ce(this.a),K(this.N,Ae(this,"Will abort after "+this.ab+"ms if incomplete, xhr2 "+this.$b)),this.$b?(this.a.timeout=this.ab,this.a.ontimeout=q(this.ub,this)):this.Yb=se(this.ub,this.ab,this)),K(this.N,Ae(this,"Sending request")),this.Ib=!0,this.a.send(a),this.Ib=!1}catch(f){K(this.N,Ae(this,"Send error: "+f.message)),this.I(5,f)}};var Ce=function(a){return y&&z(9)&&ga(a.timeout)&&void 0!==a.ontimeout},Ga=function(a){return"content-type"==a.toLowerCase()};
L.prototype.ub=function(){"undefined"!=typeof aa&&this.a&&(this.nb="Timed out after "+this.ab+"ms, aborting",K(this.N,Ae(this,this.nb)),this.dispatchEvent("timeout"),this.abort(8))};L.prototype.I=function(a,b){this.ja=!1;this.a&&(this.ya=!0,this.a.abort(),this.ya=!1);this.nb=b;De(this);Ee(this)};var De=function(a){a.jc||(a.jc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))};
L.prototype.abort=function(){this.a&&this.ja&&(K(this.N,Ae(this,"Aborting")),this.ja=!1,this.ya=!0,this.a.abort(),this.ya=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Ee(this))};L.prototype.Ka=function(){this.a&&(this.ja&&(this.ja=!1,this.ya=!0,this.a.abort(),this.ya=!1),Ee(this,!0));L.Ic.Ka.call(this)};L.prototype.kd=function(){this.isDisposed()||(this.qc||this.Ib||this.ya?Fe(this):this.re())};L.prototype.re=function(){Fe(this)};
var Fe=function(a){if(a.ja&&"undefined"!=typeof aa)if(a.bc[1]&&4==Ge(a)&&2==He(a))K(a.N,Ae(a,"Local request error detected and ignored"));else if(a.Ib&&4==Ge(a))se(a.kd,0,a);else if(a.dispatchEvent("readystatechange"),4==Ge(a)){K(a.N,Ae(a,"Request complete"));a.ja=!1;try{var b=He(a),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}var d;if(!(d=c)){var e;if(e=0===b){var f=String(a.Jb).match(ue)[1]||null;if(!f&&l.self&&l.self.location)var g=l.self.location.protocol,
f=g.substr(0,g.length-1);e=!ye.test(f?f.toLowerCase():"")}d=e}if(d)a.dispatchEvent("complete"),a.dispatchEvent("success");else{var k;try{k=2<Ge(a)?a.a.statusText:""}catch(p){K(a.N,"Can not get status: "+p.message),k=""}a.nb=k+" ["+He(a)+"]";De(a)}}finally{Ee(a)}}};L.prototype.jd=function(a,b){v("progress"===a.type,"goog.net.EventType.PROGRESS is of the same type as raw XHR progress.");this.dispatchEvent(Ie(a,"progress"));this.dispatchEvent(Ie(a,b?"downloadprogress":"uploadprogress"))};
var Ie=function(a,b){return{type:b,lengthComputable:a.lengthComputable,loaded:a.loaded,total:a.total}},Ee=function(a,b){if(a.a){Be(a);var c=a.a,d=a.bc[0]?ba:null;a.a=null;a.bc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.N)&&c.log(le,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}},Be=function(a){a.a&&a.$b&&(a.a.ontimeout=null);ga(a.Yb)&&(l.clearTimeout(a.Yb),a.Yb=null)},Ge=function(a){return a.a?a.a.readyState:0},He=function(a){try{return 2<Ge(a)?
a.a.status:-1}catch(b){return-1}},Je=function(a){try{return a.a?a.a.responseText:""}catch(b){return K(a.N,"Can not get responseText: "+b.message),""}},Ae=function(a,b){return b+" ["+a.dd+" "+a.Jb+" "+He(a)+"]"};var Ke=function(a,b){this.ka=this.Ga=this.pa="";this.Sa=null;this.xa=this.ma="";this.K=this.ie=!1;var c;if(a instanceof Ke)this.K=void 0!==b?b:a.K,Le(this,a.pa),c=a.Ga,M(this),this.Ga=c,Me(this,a.ka),Ne(this,a.Sa),Oe(this,a.ma),Pe(this,a.Y.clone()),c=a.xa,M(this),this.xa=c;else if(a&&(c=String(a).match(ue))){this.K=!!b;Le(this,c[1]||"",!0);var d=c[2]||"";M(this);this.Ga=Qe(d);Me(this,c[3]||"",!0);Ne(this,c[4]);Oe(this,c[5]||"",!0);Pe(this,c[6]||"",!0);c=c[7]||"";M(this);this.xa=Qe(c)}else this.K=
!!b,this.Y=new N(null,0,this.K)};Ke.prototype.toString=function(){var a=[],b=this.pa;b&&a.push(Re(b,Se,!0),":");var c=this.ka;if(c||"file"==b)a.push("//"),(b=this.Ga)&&a.push(Re(b,Se,!0),"@"),a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),c=this.Sa,null!=c&&a.push(":",String(c));if(c=this.ma)this.ka&&"/"!=c.charAt(0)&&a.push("/"),a.push(Re(c,"/"==c.charAt(0)?Te:Ue,!0));(c=this.Y.toString())&&a.push("?",c);(c=this.xa)&&a.push("#",Re(c,Ve));return a.join("")};
Ke.prototype.resolve=function(a){var b=this.clone(),c=!!a.pa;c?Le(b,a.pa):c=!!a.Ga;if(c){var d=a.Ga;M(b);b.Ga=d}else c=!!a.ka;c?Me(b,a.ka):c=null!=a.Sa;d=a.ma;if(c)Ne(b,a.Sa);else if(c=!!a.ma){if("/"!=d.charAt(0))if(this.ka&&!this.ma)d="/"+d;else{var e=b.ma.lastIndexOf("/");-1!=e&&(d=b.ma.substr(0,e+1)+d)}e=d;if(".."==e||"."==e)d="";else if(u(e,"./")||u(e,"/.")){for(var d=0==e.lastIndexOf("/",0),e=e.split("/"),f=[],g=0;g<e.length;){var k=e[g++];"."==k?d&&g==e.length&&f.push(""):".."==k?((1<f.length||
1==f.length&&""!=f[0])&&f.pop(),d&&g==e.length&&f.push("")):(f.push(k),d=!0)}d=f.join("/")}else d=e}c?Oe(b,d):c=""!==a.Y.toString();c?Pe(b,Qe(a.Y.toString())):c=!!a.xa;c&&(a=a.xa,M(b),b.xa=a);return b};Ke.prototype.clone=function(){return new Ke(this)};
var Le=function(a,b,c){M(a);a.pa=c?Qe(b,!0):b;a.pa&&(a.pa=a.pa.replace(/:$/,""))},Me=function(a,b,c){M(a);a.ka=c?Qe(b,!0):b},Ne=function(a,b){M(a);if(b){b=Number(b);if(isNaN(b)||0>b)throw Error("Bad port number "+b);a.Sa=b}else a.Sa=null},Oe=function(a,b,c){M(a);a.ma=c?Qe(b,!0):b},Pe=function(a,b,c){M(a);b instanceof N?(a.Y=b,a.Y.Fc(a.K)):(c||(b=Re(b,We)),a.Y=new N(b,0,a.K))},O=function(a,b,c){M(a);a.Y.set(b,c)},M=function(a){if(a.ie)throw Error("Tried to modify a read-only Uri");};
Ke.prototype.Fc=function(a){this.K=a;this.Y&&this.Y.Fc(a);return this};
var Xe=function(a,b){var c=new Ke(null,void 0);Le(c,"https");a&&Me(c,a);b&&Oe(c,b);return c},Qe=function(a,b){return a?b?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""},Re=function(a,b,c){return m(a)?(a=encodeURI(a).replace(b,Ye),c&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null},Ye=function(a){a=a.charCodeAt(0);return"%"+(a>>4&15).toString(16)+(a&15).toString(16)},Se=/[#\/\?@]/g,Ue=/[\#\?:]/g,Te=/[\#\?]/g,We=/[\#\?@]/g,Ve=/#/g,N=function(a,b,c){this.i=this.j=null;this.H=a||null;
this.K=!!c},Ze=function(a){a.j||(a.j=new ae,a.i=0,a.H&&ve(a.H,function(b,c){a.add(decodeURIComponent(b.replace(/\+/g," ")),c)}))},af=function(a){var b=fe(a);if("undefined"==typeof b)throw Error("Keys are undefined");var c=new N(null,0,void 0);a=ee(a);for(var d=0;d<b.length;d++){var e=b[d],f=a[d];ea(f)?$e(c,e,f):c.add(e,f)}return c};h=N.prototype;h.Wc=function(){Ze(this);return this.i};
h.add=function(a,b){Ze(this);this.H=null;a=this.J(a);var c=this.j.get(a);c||this.j.set(a,c=[]);c.push(b);this.i=za(this.i)+1;return this};h.remove=function(a){Ze(this);a=this.J(a);return this.j.gb(a)?(this.H=null,this.i=za(this.i)-this.j.get(a).length,this.j.remove(a)):!1};h.gb=function(a){Ze(this);a=this.J(a);return this.j.gb(a)};h.ca=function(){Ze(this);for(var a=this.j.R(),b=this.j.ca(),c=[],d=0;d<b.length;d++)for(var e=a[d],f=0;f<e.length;f++)c.push(b[d]);return c};
h.R=function(a){Ze(this);var b=[];if(m(a))this.gb(a)&&(b=Ma(b,this.j.get(this.J(a))));else{a=this.j.R();for(var c=0;c<a.length;c++)b=Ma(b,a[c])}return b};h.set=function(a,b){Ze(this);this.H=null;a=this.J(a);this.gb(a)&&(this.i=za(this.i)-this.j.get(a).length);this.j.set(a,[b]);this.i=za(this.i)+1;return this};h.get=function(a,b){var c=a?this.R(a):[];return 0<c.length?String(c[0]):b};var $e=function(a,b,c){a.remove(b);0<c.length&&(a.H=null,a.j.set(a.J(b),Oa(c)),a.i=za(a.i)+c.length)};
N.prototype.toString=function(){if(this.H)return this.H;if(!this.j)return"";for(var a=[],b=this.j.ca(),c=0;c<b.length;c++)for(var d=b[c],e=encodeURIComponent(String(d)),d=this.R(d),f=0;f<d.length;f++){var g=e;""!==d[f]&&(g+="="+encodeURIComponent(String(d[f])));a.push(g)}return this.H=a.join("&")};N.prototype.clone=function(){var a=new N;a.H=this.H;this.j&&(a.j=this.j.clone(),a.i=this.i);return a};N.prototype.J=function(a){a=String(a);this.K&&(a=a.toLowerCase());return a};
N.prototype.Fc=function(a){a&&!this.K&&(Ze(this),this.H=null,this.j.forEach(function(a,c){var d=c.toLowerCase();c!=d&&(this.remove(c),$e(this,d,a))},this));this.K=a};var bf=function(){return l.window&&l.window.location.href||""},cf=function(a,b){var c=[],d;for(d in a)d in b?typeof a[d]!=typeof b[d]?c.push(d):ea(a[d])?Ua(a[d],b[d])||c.push(d):"object"==typeof a[d]&&null!=a[d]&&null!=b[d]?0<cf(a[d],b[d]).length&&c.push(d):a[d]!==b[d]&&c.push(d):c.push(d);for(d in b)d in a||c.push(d);return c},ff=function(){var a;a=df();a="Chrome"!=ef(a)?null:(a=a.match(/\sChrome\/(\d+)/i))&&2==a.length?parseInt(a[1],10):null;return a&&30>a?!1:!y||!pb||9<pb},gf=function(a){(a||l.window).close()},
hf=function(a,b,c){var d=Math.floor(1E9*Math.random()).toString();b=b||500;c=c||600;var e=(window.screen.availHeight-c)/2,f=(window.screen.availWidth-b)/2;b={width:b,height:c,top:0<e?e:0,left:0<f?f:0,location:!0,resizable:!0,statusbar:!0,toolbar:!1};d&&(b.target=d);"Firefox"==ef(df())&&(a=a||"http://localhost",b.scrollbars=!0);var g;c=a||"about:blank";(d=b)||(d={});a=window;b=c instanceof A?c:Cb("undefined"!=typeof c.href?c.href:String(c));c=d.target||c.target;e=[];for(g in d)switch(g){case "width":case "height":case "top":case "left":e.push(g+
"="+d[g]);break;case "target":case "noreferrer":break;default:e.push(g+"="+(d[g]?1:0))}g=e.join(",");(x("iPhone")&&!x("iPod")&&!x("iPad")||x("iPad")||x("iPod"))&&a.navigator&&a.navigator.standalone&&c&&"_self"!=c?(g=a.document.createElement("A"),b=b instanceof A?b:Cb(b),g.href=zb(b),g.setAttribute("target",c),d.noreferrer&&g.setAttribute("rel","noreferrer"),d=document.createEvent("MouseEvent"),d.initMouseEvent("click",!0,!0,a,1),g.dispatchEvent(d),g={}):d.noreferrer?(g=a.open("",c,g),d=zb(b),g&&(eb&&
u(d,";")&&(d="'"+d.replace(/'/g,"%27")+"'"),g.opener=null,a=new wb,a.Wb="b/12014412, meta tag with sanitized URL",ua.test(d)&&(-1!=d.indexOf("&")&&(d=d.replace(oa,"&amp;")),-1!=d.indexOf("<")&&(d=d.replace(pa,"&lt;")),-1!=d.indexOf(">")&&(d=d.replace(qa,"&gt;")),-1!=d.indexOf('"')&&(d=d.replace(ra,"&quot;")),-1!=d.indexOf("'")&&(d=d.replace(sa,"&#39;")),-1!=d.indexOf("\x00")&&(d=d.replace(ta,"&#0;"))),d='<META HTTP-EQUIV="refresh" content="0; url='+d+'">',Aa(xb(a),"must provide justification"),v(!/^[\s\xa0]*$/.test(xb(a)),
"must provide non-empty justification"),g.document.write(Fb((new Eb).he(d))),g.document.close())):g=a.open(zb(b),c,g);if(g)try{g.focus()}catch(k){}return g},jf=function(a){return new H(function(b){var c=function(){te(2E3).then(function(){if(!a||a.closed)b();else return c()})};return c()})},kf=function(){var a=null;return(new H(function(b){"complete"==l.document.readyState?b():(a=function(){b()},dc(window,"load",a))})).F(function(b){fc(window,"load",a);throw b;})},lf=function(a){switch(a||l.navigator&&
l.navigator.product||""){case "ReactNative":return"ReactNative";default:return"undefined"!==typeof l.process?"Node":"Browser"}},mf=function(){var a=lf();return"ReactNative"===a||"Node"===a},ef=function(a){var b=a.toLowerCase();if(u(b,"opera/")||u(b,"opr/")||u(b,"opios/"))return"Opera";if(u(b,"iemobile"))return"IEMobile";if(u(b,"msie")||u(b,"trident/"))return"IE";if(u(b,"edge/"))return"Edge";if(u(b,"firefox/"))return"Firefox";if(u(b,"silk/"))return"Silk";if(u(b,"blackberry"))return"Blackberry";if(u(b,
"webos"))return"Webos";if(!u(b,"safari/")||u(b,"chrome/")||u(b,"crios/")||u(b,"android"))if(!u(b,"chrome/")&&!u(b,"crios/")||u(b,"edge/")){if(u(b,"android"))return"Android";if((a=a.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/))&&2==a.length)return a[1]}else return"Chrome";else return"Safari";return"Other"},nf=function(a){var b=lf(void 0);return("Browser"===b?ef(df()):b)+"/JsCore/"+a},df=function(){return l.navigator&&l.navigator.userAgent||""},of=function(a){a=a.split(".");for(var b=l,c=0;c<a.length&&
"object"==typeof b&&null!=b;c++)b=b[a[c]];c!=a.length&&(b=void 0);return b},qf=function(){var a;if(!(a=!l.location||!l.location.protocol||"http:"!=l.location.protocol&&"https:"!=l.location.protocol||mf())){var b;a:{try{var c=l.localStorage,d=pf();if(c){c.setItem(d,"1");c.removeItem(d);b=!0;break a}}catch(e){}b=!1}a=!b}return!a},rf=function(a){a=a||df();var b=(a||df()).toLowerCase();return b.match(/android/)||b.match(/webos/)||b.match(/iphone|ipad|ipod/)||b.match(/blackberry/)||b.match(/windows phone/)||
b.match(/iemobile/)||"Firefox"==ef(a)?!1:!0},sf=function(a){return"undefined"===typeof a?null:oc(a)},tf=function(a){if(null!==a){var b;try{b=lc(a)}catch(c){try{b=JSON.parse(a)}catch(d){throw c;}}return b}},pf=function(a){return a?a:""+Math.floor(1E9*Math.random()).toString()};var uf;try{var vf={};Object.defineProperty(vf,"abcd",{configurable:!0,enumerable:!0,value:1});Object.defineProperty(vf,"abcd",{configurable:!0,enumerable:!0,value:2});uf=2==vf.abcd}catch(a){uf=!1}
var P=function(a,b,c){uf?Object.defineProperty(a,b,{configurable:!0,enumerable:!0,value:c}):a[b]=c},wf=function(a,b){if(b)for(var c in b)b.hasOwnProperty(c)&&P(a,c,b[c])},xf=function(a){var b={},c;for(c in a)a.hasOwnProperty(c)&&(b[c]=a[c]);return b},yf=function(a,b){if(!b||!b.length)return!0;if(!a)return!1;for(var c=0;c<b.length;c++){var d=a[b[c]];if(void 0===d||null===d||""===d)return!1}return!0};var zf={zd:{rb:985,qb:735,providerId:"facebook.com"},Ad:{rb:500,qb:620,providerId:"github.com"},Bd:{rb:515,qb:680,providerId:"google.com"},Fd:{rb:485,qb:705,providerId:"twitter.com"}},Af=function(a){for(var b in zf)if(zf[b].providerId==a)return zf[b];return null};var Q=function(a,b){this.code="auth/"+a;this.message=b||Bf[a]||""};r(Q,Error);Q.prototype.G=function(){return{name:this.code,code:this.code,message:this.message}};
var Bf={"argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.",
"email-already-in-use":"The email address is already in use by another account.","expired-action-code":"The action code has expired. ","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal error has occurred.","invalid-user-token":"The user's credential is no longer valid. The user must sign in again.","invalid-auth-event":"An internal error has occurred.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.",
"invalid-email":"The email address is badly formatted.","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-credential":"The supplied auth credential is malformed or has expired.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.",
"invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","missing-iframe-start":"An internal error has occurred.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","app-deleted":"This instance of FirebaseApp has been deleted.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.",
"network-request-failed":"A network error (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal error has occurred.","no-such-provider":"User was not linked to an account with the given provider.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http or https and web storage must be enabled.',
"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.",
"user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported."};var Cf=function(a,b,c,d,e){this.ra=a;this.wa=b||null;this.cb=c||null;this.Tb=d||null;this.I=e||null;if(this.cb||this.I){if(this.cb&&this.I)throw new Q("invalid-auth-event");if(this.cb&&!this.Tb)throw new Q("invalid-auth-event");}else throw new Q("invalid-auth-event");};Cf.prototype.getError=function(){return this.I};Cf.prototype.G=function(){return{type:this.ra,eventId:this.wa,urlResponse:this.cb,sessionId:this.Tb,error:this.I&&this.I.G()}};var Df=function(a){this.ke=a.sub;la();this.zb=a.email||null};var Ef=function(a,b,c,d){var e={};ha(c)?e=c:b&&m(c)&&m(d)?e={oauthToken:c,oauthTokenSecret:d}:!b&&m(c)&&(e={accessToken:c});if(b||!e.idToken&&!e.accessToken)if(b&&e.oauthToken&&e.oauthTokenSecret)P(this,"accessToken",e.oauthToken),P(this,"secret",e.oauthTokenSecret);else{if(b)throw new Q("argument-error","credential failed: expected 2 arguments (the OAuth access token and secret).");throw new Q("argument-error","credential failed: expected 1 argument (the OAuth access token).");}else e.idToken&&P(this,
"idToken",e.idToken),e.accessToken&&P(this,"accessToken",e.accessToken);P(this,"provider",a)};Ef.prototype.Db=function(a){return Ff(a,Gf(this))};Ef.prototype.ed=function(a,b){var c=Gf(this);c.idToken=b;return R(a,Hf,c)};var Gf=function(a){var b={};a.idToken&&(b.id_token=a.idToken);a.accessToken&&(b.access_token=a.accessToken);a.secret&&(b.oauth_token_secret=a.secret);b.providerId=a.provider;return{postBody:af(b).toString(),requestUri:qf()?bf():"http://localhost"}};
Ef.prototype.G=function(){var a={provider:this.provider};this.idToken&&(a.oauthIdToken=this.idToken);this.accessToken&&(a.oauthAccessToken=this.accessToken);this.secret&&(a.oauthTokenSecret=this.secret);return a};
var If=function(a,b){var c=!!b,d=function(){wf(this,{providerId:a,isOAuthProvider:!0});this.Ec=[];"google.com"==a&&this.addScope("profile")};c||(d.prototype.addScope=function(a){Ia(this.Ec,a)||this.Ec.push(a)});d.prototype.Eb=function(){return Oa(this.Ec)};d.credential=function(b,d){return new Ef(a,c,b,d)};wf(d,{PROVIDER_ID:a});return d},Jf=If("facebook.com");Jf.prototype.addScope=Jf.prototype.addScope||void 0;var Kf=If("github.com");Kf.prototype.addScope=Kf.prototype.addScope||void 0;var Lf=If("google.com");
Lf.prototype.addScope=Lf.prototype.addScope||void 0;Lf.credential=function(a,b){if(!a&&!b)throw new Q("argument-error","credential failed: must provide the ID token and/or the access token.");return new Ef("google.com",!1,ha(a)?a:{idToken:a||null,accessToken:b||null})};var Mf=If("twitter.com",!0),Nf=function(a,b){this.zb=a;this.wc=b;P(this,"provider","password")};Nf.prototype.Db=function(a){return R(a,Of,{email:this.zb,password:this.wc})};
Nf.prototype.ed=function(a,b){return R(a,Pf,{idToken:b,email:this.zb,password:this.wc})};Nf.prototype.G=function(){return{email:this.zb,password:this.wc}};var Qf=function(){wf(this,{providerId:"password",isOAuthProvider:!1})};wf(Qf,{PROVIDER_ID:"password"});
var Rf={Je:Qf,zd:Jf,Bd:Lf,Ad:Kf,Fd:Mf},Sf=function(a){var b=a&&a.providerId;if(!b)return null;var c=a&&a.oauthAccessToken,d=a&&a.oauthTokenSecret;a=a&&a.oauthIdToken;for(var e in Rf)if(Rf[e].PROVIDER_ID==b)try{return Rf[e].credential({accessToken:c,idToken:a,oauthToken:c,oauthTokenSecret:d})}catch(f){break}return null};var Tf=function(a,b,c){Q.call(this,"account-exists-with-different-credential",c);P(this,"email",a);P(this,"credential",b)};r(Tf,Q);Tf.prototype.G=function(){var a={code:this.code,message:this.message,email:this.email},b=this.credential&&this.credential.G();b&&(Za(a,b),a.providerId=b.provider,delete a.provider);return a};var Uf=function(a){this.Ie=a};r(Uf,sc);Uf.prototype.yb=function(){return new this.Ie};Uf.prototype.sc=function(){return{}};
var S=function(a,b,c){var d;d="Node"==lf();d=l.XMLHttpRequest||d&&firebase.INTERNAL.node&&firebase.INTERNAL.node.XMLHttpRequest;if(!d)throw new Q("internal-error","The XMLHttpRequest compatibility library was not found.");this.u=a;a=b||{};this.xe=a.secureTokenEndpoint||"https://securetoken.googleapis.com/v1/token";this.ye=a.secureTokenTimeout||1E4;this.qd=Xa(a.secureTokenHeaders||Vf);this.Sd=a.firebaseEndpoint||"https://www.googleapis.com/identitytoolkit/v3/relyingparty/";this.Td=a.firebaseTimeout||
1E4;this.Vc=Xa(a.firebaseHeaders||Wf);c&&(this.Vc["X-Client-Version"]=c,this.qd["X-Client-Version"]=c);this.Kd=new xc;this.He=new Uf(d)},Xf,Vf={"Content-Type":"application/x-www-form-urlencoded"},Wf={"Content-Type":"application/json"},Zf=function(a,b,c,d,e,f,g){ff()?a=q(a.Ae,a):(Xf||(Xf=new H(function(a,b){Yf(a,b)})),a=q(a.ze,a));a(b,c,d,e,f,g)};
S.prototype.Ae=function(a,b,c,d,e,f){var g="Node"==lf(),k=mf()?g?new L(this.He):new L:new L(this.Kd),p;f&&(k.ab=Math.max(0,f),p=setTimeout(function(){k.dispatchEvent("timeout")},f));k.listen("complete",function(){p&&clearTimeout(p);var a=null;try{var c;c=this.a?lc(this.a.responseText):void 0;a=c||null}catch(d){try{a=JSON.parse(Je(this))||null}catch(e){a=null}}b&&b(a)});ec(k,"ready",function(){p&&clearTimeout(p);this.va||(this.va=!0,this.Ka())});ec(k,"timeout",function(){p&&clearTimeout(p);this.va||
(this.va=!0,this.Ka());b&&b(null)});k.send(a,c,d,e)};var $f="__fcb"+Math.floor(1E6*Math.random()).toString(),Yf=function(a,b){((window.gapi||{}).client||{}).request?a():(l[$f]=function(){((window.gapi||{}).client||{}).request?a():b(Error("CORS_UNSUPPORTED"))},Nd(Vd("https://apis.google.com/js/client.js?onload="+$f),function(){b(Error("CORS_UNSUPPORTED"))}))};
S.prototype.ze=function(a,b,c,d,e){var f=this;Xf.then(function(){window.gapi.client.setApiKey(f.u);var g=window.gapi.auth.getToken();window.gapi.auth.setToken(null);window.gapi.client.request({path:a,method:c,body:d,headers:e,authType:"none",callback:function(a){window.gapi.auth.setToken(g);b&&b(a)}})}).F(function(a){b&&b({error:{message:a&&a.message||"CORS_UNSUPPORTED"}})})};
var bg=function(a,b){return new H(function(c,d){"refresh_token"==b.grant_type&&b.refresh_token||"authorization_code"==b.grant_type&&b.code?Zf(a,a.xe+"?key="+encodeURIComponent(a.u),function(a){a?a.error?d(ag(a)):a.access_token&&a.refresh_token?c(a):d(new Q("internal-error")):d(new Q("network-request-failed"))},"POST",af(b).toString(),a.qd,a.ye):d(new Q("internal-error"))})},cg=function(a){var b={},c;for(c in a)null!==a[c]&&void 0!==a[c]&&(b[c]=a[c]);return oc(b)},dg=function(a,b,c,d,e){var f=a.Sd+
b+"?key="+encodeURIComponent(a.u);e&&(f+="&cb="+la().toString());return new H(function(b,e){Zf(a,f,function(a){a?a.error?e(ag(a)):b(a):e(new Q("network-request-failed"))},c,cg(d),a.Vc,a.Td)})},eg=function(a){if(!kc.test(a.email))throw new Q("invalid-email");},fg=function(a){"email"in a&&eg(a)},hg=function(a,b){var c=qf()?bf():"http://localhost";return R(a,gg,{identifier:b,continueUri:c}).then(function(a){return a.allProviders||[]})},jg=function(a){return R(a,ig,{}).then(function(a){return a.authorizedDomains||
[]})},kg=function(a){if(!a.idToken)throw new Q("internal-error");};S.prototype.signInAnonymously=function(){return R(this,lg,{})};S.prototype.updateEmail=function(a,b){return R(this,mg,{idToken:a,email:b})};S.prototype.updatePassword=function(a,b){return R(this,Pf,{idToken:a,password:b})};var ng={displayName:"DISPLAY_NAME",photoUrl:"PHOTO_URL"};
S.prototype.updateProfile=function(a,b){var c={idToken:a},d=[];Qa(ng,function(a,f){var g=b[f];null===g?d.push(a):f in b&&(c[f]=g)});d.length&&(c.deleteAttribute=d);return R(this,mg,c)};S.prototype.sendPasswordResetEmail=function(a){return R(this,og,{requestType:"PASSWORD_RESET",email:a})};S.prototype.sendEmailVerification=function(a){return R(this,pg,{requestType:"VERIFY_EMAIL",idToken:a})};
var rg=function(a,b,c){return R(a,qg,{idToken:b,deleteProvider:c})},sg=function(a){if(!a.requestUri||!a.sessionId&&!a.postBody)throw new Q("internal-error");},tg=function(a){if(a.needConfirmation)throw(a&&a.email?new Tf(a.email,Sf(a),a.message):null)||new Q("account-exists-with-different-credential");if(!a.idToken)throw new Q("internal-error");},Ff=function(a,b){return R(a,ug,b)},vg=function(a){if(!a.oobCode)throw new Q("invalid-action-code");};
S.prototype.confirmPasswordReset=function(a,b){return R(this,wg,{oobCode:a,newPassword:b})};S.prototype.checkActionCode=function(a){return R(this,xg,{oobCode:a})};S.prototype.applyActionCode=function(a){return R(this,yg,{oobCode:a})};
var yg={endpoint:"setAccountInfo",C:vg,Za:"email"},xg={endpoint:"resetPassword",C:vg,na:function(a){if(!kc.test(a.email))throw new Q("internal-error");}},zg={endpoint:"signupNewUser",C:function(a){eg(a);if(!a.password)throw new Q("weak-password");},na:kg,oa:!0},gg={endpoint:"createAuthUri"},Ag={endpoint:"deleteAccount",Ya:["idToken"]},qg={endpoint:"setAccountInfo",Ya:["idToken","deleteProvider"],C:function(a){if(!ea(a.deleteProvider))throw new Q("internal-error");}},Bg={endpoint:"getAccountInfo"},
pg={endpoint:"getOobConfirmationCode",Ya:["idToken","requestType"],C:function(a){if("VERIFY_EMAIL"!=a.requestType)throw new Q("internal-error");},Za:"email"},og={endpoint:"getOobConfirmationCode",Ya:["requestType"],C:function(a){if("PASSWORD_RESET"!=a.requestType)throw new Q("internal-error");eg(a)},Za:"email"},ig={Jd:!0,endpoint:"getProjectConfig",ae:"GET"},wg={endpoint:"resetPassword",C:vg,Za:"email"},mg={endpoint:"setAccountInfo",Ya:["idToken"],C:fg,oa:!0},Pf={endpoint:"setAccountInfo",Ya:["idToken"],
C:function(a){fg(a);if(!a.password)throw new Q("weak-password");},na:kg,oa:!0},lg={endpoint:"signupNewUser",na:kg,oa:!0},ug={endpoint:"verifyAssertion",C:sg,na:tg,oa:!0},Hf={endpoint:"verifyAssertion",C:function(a){sg(a);if(!a.idToken)throw new Q("internal-error");},na:tg,oa:!0},Cg={endpoint:"verifyCustomToken",C:function(a){if(!a.token)throw new Q("invalid-custom-token");},na:kg,oa:!0},Of={endpoint:"verifyPassword",C:function(a){eg(a);if(!a.password)throw new Q("wrong-password");},na:kg,oa:!0},R=
function(a,b,c){if(!yf(c,b.Ya))return J(new Q("internal-error"));var d=b.ae||"POST",e;return I(c).then(b.C).then(function(){b.oa&&(c.returnSecureToken=!0);return dg(a,b.endpoint,d,c,b.Jd||!1)}).then(function(a){return e=a}).then(b.na).then(function(){if(!b.Za)return e;if(!(b.Za in e))throw new Q("internal-error");return e[b.Za]})},ag=function(a){var b,c;c=(a.error&&a.error.errors&&a.error.errors[0]||{}).reason||"";var d={keyInvalid:"invalid-api-key",ipRefererBlocked:"app-not-authorized"};if(c=d[c]?
new Q(d[c]):null)return c;c=a.error&&a.error.message||"";d={INVALID_CUSTOM_TOKEN:"invalid-custom-token",CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_EMAIL:"invalid-email",INVALID_PASSWORD:"wrong-password",USER_DISABLED:"user-disabled",MISSING_PASSWORD:"internal-error",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",
FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",EMAIL_NOT_FOUND:"user-not-found",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",CORS_UNSUPPORTED:"cors-unsupported",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",WEAK_PASSWORD:"weak-password",OPERATION_NOT_ALLOWED:"operation-not-allowed"};
b=(b=c.match(/:\s*(.*)$/))&&1<b.length?b[1]:void 0;for(var e in d)if(0===c.indexOf(e))return new Q(d[e],b);!b&&a&&(b=sf(a));return new Q("internal-error",b)};var Dg=function(a){this.O=a};Dg.prototype.value=function(){return this.O};Dg.prototype.td=function(a){this.O.style=a;return this};var Eg=function(a){this.O=a||{}};Eg.prototype.value=function(){return this.O};Eg.prototype.td=function(a){this.O.style=a;return this};var Gg=function(a){this.Ge=a;this.oc=null;this.pe=Fg(this)},Hg,Ig=function(a){var b=new Eg;b.O.where=document.body;b.O.url=a.Ge;b.O.messageHandlersFilter=of("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER");b.O.attributes=b.O.attributes||{};(new Dg(b.O.attributes)).td({position:"absolute",top:"-100px",width:"1px",height:"1px"});b.O.dontclear=!0;return b},Fg=function(a){return Jg().then(function(){return new H(function(b){of("gapi.iframes.getContext")().open(Ig(a).value(),function(c){a.oc=c;a.oc.restyle({setHideOnLeave:!1});
b()})})})},Kg=function(a,b){a.pe.then(function(){a.oc.register("authEvent",b,of("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"))})},Lg="__iframefcb"+Math.floor(1E6*Math.random()).toString(),Jg=function(){return Hg?Hg:Hg=new H(function(a,b){var c=function(){of("gapi.load")("gapi.iframes",function(){a()})};of("gapi.iframes.Iframe")?a():of("gapi.load")?c():(l[Lg]=function(){of("gapi.load")?c():b()},Nd(Vd("https://apis.google.com/js/api.js?onload="+Lg),function(){b()}))})};var Ng=function(a,b,c,d){this.U=a;this.u=b;this.aa=c;d=this.ua=d||null;a=Xe(a,"/__/auth/iframe");O(a,"apiKey",b);O(a,"appName",c);d&&O(a,"v",d);this.ce=a.toString();this.de=new Gg(this.ce);this.dc=[];Mg(this)},Og=function(a,b,c,d,e,f,g,k,p){a=Xe(a,"/__/auth/handler");O(a,"apiKey",b);O(a,"appName",c);O(a,"authType",d);O(a,"providerId",e);f&&f.length&&O(a,"scopes",f.join(","));g&&O(a,"redirectUrl",g);k&&O(a,"eventId",k);p&&O(a,"v",p);return a.toString()},Mg=function(a){Kg(a.de,function(b){var c={};
if(b&&b.authEvent){var d=!1;b=b.authEvent||{};if(b.type){if(c=b.error)var e=(c=b.error)&&(c.name||c.code),c=e?new Q(e.substring(5),c.message):null;b=new Cf(b.type,b.eventId,b.urlResponse,b.sessionId,c)}else b=null;for(c=0;c<a.dc.length;c++)d=a.dc[c](b)||d;c={};c.status=d?"ACK":"ERROR";return I(c)}c.status="ERROR";return I(c)})};var Pg=function(a){this.o=a||firebase.INTERNAL.reactNative&&firebase.INTERNAL.reactNative.AsyncStorage;if(!this.o)throw new Q("internal-error","The React Native compatibility library was not found.");};h=Pg.prototype;h.get=function(a){return I(this.o.getItem(a)).then(function(a){return a&&tf(a)})};h.set=function(a,b){return I(this.o.setItem(a,sf(b)))};h.remove=function(a){return I(this.o.removeItem(a))};h.ta=function(){};h.Ea=function(){};var Qg=function(){this.o={}};h=Qg.prototype;h.get=function(a){return I(this.o[a])};h.set=function(a,b){this.o[a]=b;return I()};h.remove=function(a){delete this.o[a];return I()};h.ta=function(){};h.Ea=function(){};var Sg=function(){if(!Rg()){if("Node"==lf())throw new Q("internal-error","The LocalStorage compatibility library was not found.");throw new Q("web-storage-unsupported");}this.o=l.localStorage||firebase.INTERNAL.node.localStorage},Rg=function(){var a="Node"==lf(),a=l.localStorage||a&&firebase.INTERNAL.node&&firebase.INTERNAL.node.localStorage;if(!a)return!1;try{return a.setItem("__sak","1"),a.removeItem("__sak"),!0}catch(b){return!1}};h=Sg.prototype;
h.get=function(a){var b=this;return I().then(function(){var c=b.o.getItem(a);return tf(c)})};h.set=function(a,b){var c=this;return I().then(function(){var d=sf(b);null===d?c.remove(a):c.o.setItem(a,d)})};h.remove=function(a){var b=this;return I().then(function(){b.o.removeItem(a)})};h.ta=function(a){l.window&&Xb(l.window,"storage",a)};h.Ea=function(a){l.window&&fc(l.window,"storage",a)};var Tg=function(){this.o={}};h=Tg.prototype;h.get=function(){return I(null)};h.set=function(){return I()};h.remove=function(){return I()};h.ta=function(){};h.Ea=function(){};var Vg=function(){if(!Ug()){if("Node"==lf())throw new Q("internal-error","The SessionStorage compatibility library was not found.");throw new Q("web-storage-unsupported");}this.o=l.sessionStorage||firebase.INTERNAL.node.sessionStorage},Ug=function(){var a="Node"==lf(),a=l.sessionStorage||a&&firebase.INTERNAL.node&&firebase.INTERNAL.node.sessionStorage;if(!a)return!1;try{return a.setItem("__sak","1"),a.removeItem("__sak"),!0}catch(b){return!1}};h=Vg.prototype;
h.get=function(a){var b=this;return I().then(function(){var c=b.o.getItem(a);return tf(c)})};h.set=function(a,b){var c=this;return I().then(function(){var d=sf(b);null===d?c.remove(a):c.o.setItem(a,d)})};h.remove=function(a){var b=this;return I().then(function(){b.o.removeItem(a)})};h.ta=function(){};h.Ea=function(){};var Zg=function(){this.Sc={Browser:Wg,Node:Xg,ReactNative:Yg}[lf()]},$g,Wg={A:Sg,Jc:Vg},Xg={A:Sg,Jc:Vg},Yg={A:Pg,Jc:Tg};var ah="First Second Third Fourth Fifth Sixth Seventh Eighth Ninth".split(" "),T=function(a,b){return{name:a||"",Z:"a valid string",optional:!!b,$:m}},bh=function(a){return{name:a||"",Z:"a valid object",optional:!1,$:ha}},ch=function(a,b){return{name:a||"",Z:"a function",optional:!!b,$:n}},dh=function(){return{name:"",Z:"null",optional:!1,$:da}},eh=function(){return{name:"credential",Z:"a valid credential",optional:!1,$:function(a){return!(!a||!a.Db)}}},fh=function(){return{name:"authProvider",Z:"a valid Auth provider",
optional:!1,$:function(a){return!!(a&&a.providerId&&a.hasOwnProperty&&a.hasOwnProperty("isOAuthProvider"))}}},gh=function(a,b,c,d){return{name:c||"",Z:a.Z+" or "+b.Z,optional:!!d,$:function(c){return a.$(c)||b.$(c)}}};var ih=function(a,b){for(var c in b){var d=b[c].name;a[d]=hh(d,a[c],b[c].b)}},U=function(a,b,c,d){a[b]=hh(b,c,d)},hh=function(a,b,c){if(!c)return b;var d=jh(a);a=function(){var a=Array.prototype.slice.call(arguments),e;a:{e=Array.prototype.slice.call(a);var k;k=0;for(var p=!1,Y=0;Y<c.length;Y++)if(c[Y].optional)p=!0;else{if(p)throw new Q("internal-error","Argument validator encountered a required argument after an optional argument.");k++}p=c.length;if(e.length<k||p<e.length)e="Expected "+(k==p?1==
k?"1 argument":k+" arguments":k+"-"+p+" arguments")+" but got "+e.length+".";else{for(k=0;k<e.length;k++)if(p=c[k].optional&&void 0===e[k],!c[k].$(e[k])&&!p){e=c[k];if(0>k||k>=ah.length)throw new Q("internal-error","Argument validator received an unsupported number of arguments.");e=ah[k]+" argument "+(e.name?'"'+e.name+'" ':"")+"must be "+e.Z+".";break a}e=null}}if(e)throw new Q("argument-error",d+" failed: "+e);return b.apply(this,a)};for(var e in b)a[e]=b[e];for(e in b.prototype)a.prototype[e]=
b.prototype[e];return a},jh=function(a){a=a.split(".");return a[a.length-1]};var kh,lh=function(a,b,c,d,e,f){this.Md=a;this.uc=b;this.hc=c;this.xd=d;this.ha=e;this.M={};this.sb=[];this.pb=0;this.ee=f||l.indexedDB},mh=function(a){return new H(function(b,c){var d=a.ee.open(a.Md,a.ha);d.onerror=function(a){c(Error(a.target.errorCode))};d.onupgradeneeded=function(b){b=b.target.result;try{b.createObjectStore(a.uc,{keyPath:a.hc})}catch(d){c(d)}};d.onsuccess=function(a){b(a.target.result)}})},nh=function(a){a.bd||(a.bd=mh(a));return a.bd},oh=function(a,b){return b.objectStore(a.uc)},
ph=function(a,b,c){return b.transaction([a.uc],c?"readwrite":"readonly")},qh=function(a){return new H(function(b,c){a.onsuccess=function(a){a&&a.target?b(a.target.result):b()};a.onerror=function(a){c(Error(a.target.errorCode))}})};h=lh.prototype;
h.set=function(a,b){var c=!1,d,e=this;return vd(nh(this).then(function(b){d=b;b=oh(e,ph(e,d,!0));return qh(b.get(a))}).then(function(f){var g=oh(e,ph(e,d,!0));if(f)return f.value=b,qh(g.put(f));e.pb++;c=!0;f={};f[e.hc]=a;f[e.xd]=b;return qh(g.add(f))}).then(function(){e.M[a]=b}),function(){c&&e.pb--})};h.get=function(a){var b=this;return nh(this).then(function(c){return qh(oh(b,ph(b,c,!1)).get(a))})};
h.remove=function(a){var b=!1,c=this;return vd(nh(this).then(function(d){b=!0;c.pb++;return qh(oh(c,ph(c,d,!0))["delete"](a))}).then(function(){delete c.M[a]}),function(){b&&c.pb--})};
h.Ce=function(){var a=this;return nh(this).then(function(b){var c=oh(a,ph(a,b,!1));return c.getAll?qh(c.getAll()):new H(function(a,b){var f=[],g=c.openCursor();g.onsuccess=function(b){(b=b.target.result)?(f.push(b.value),b["continue"]()):a(f)};g.onerror=function(a){b(Error(a.target.errorCode))}})}).then(function(b){var c={},d=[];if(0==a.pb){for(d=0;d<b.length;d++)c[b[d][a.hc]]=b[d][a.xd];d=cf(a.M,c);a.M=c}return d})};h.ta=function(a){0==this.sb.length&&this.Hc();this.sb.push(a)};
h.Ea=function(a){La(this.sb,function(b){return b==a});0==this.sb.length&&this.Vb()};h.Hc=function(){var a=this;this.Vb();var b=function(){a.yc=te(1E3).then(q(a.Ce,a)).then(function(b){0<b.length&&w(a.sb,function(a){a(b)})}).then(b).F(function(a){"STOP_EVENT"!=a.message&&b()});return a.yc};b()};h.Vb=function(){this.yc&&this.yc.cancel("STOP_EVENT")};var rh=function(a,b,c,d,e,f){this.ne=a;this.rd=b;this.Oa=d;this.we=e;this.$a=f;this.L={};$g||($g=new Zg);a=$g;try{this.Ra=new a.Sc.A}catch(g){this.Ra=new Qg,this.Oa=!1,this.$a=!0}try{this.Xb=new a.Sc.Jc}catch(g){this.Xb=new Qg}this.kb=c;this.fd=q(this.gd,this);this.ad=q(this.fe,this);this.M={}},sh,th=function(){sh||(kh||(kh=new lh("firebaseLocalStorageDb","firebaseLocalStorage","fbase_key","value",1)),sh=new rh("firebase",":",kh,y&&!!pb&&11==pb||/Edge\/\d+/.test($a),"Safari"==ef(df())&&l.window&&
l.window!=l.window.top?!0:!1,rf()));return sh};h=rh.prototype;h.J=function(a,b){return this.ne+this.rd+a.name+(b?this.rd+b:"")};h.get=function(a,b){var c=this.J(a,b);return this.Oa&&a.A?this.kb.get(c).then(function(a){return a&&a.value}):(a.A?this.Ra:this.Xb).get(c)};h.remove=function(a,b){var c=this.J(a,b);if(this.Oa&&a.A)return this.kb.remove(c);a.A&&!this.$a&&(this.M[c]=null);return(a.A?this.Ra:this.Xb).remove(c)};
h.set=function(a,b,c){var d=this.J(a,c);if(this.Oa&&a.A)return this.kb.set(d,b);var e=this,f=a.A?this.Ra:this.Xb;return f.set(d,b).then(function(){return f.get(d)}).then(function(b){a.A&&!this.$a&&(e.M[d]=b)})};h.addListener=function(a,b,c){a=this.J(a,b);this.$a||(this.M[a]=l.localStorage.getItem(a));Ta(this.L)&&this.Hc();this.L[a]||(this.L[a]=[]);this.L[a].push(c)};
h.removeListener=function(a,b,c){a=this.J(a,b);this.L[a]&&(La(this.L[a],function(a){return a==c}),0==this.L[a].length&&delete this.L[a]);Ta(this.L)&&this.Vb()};h.Hc=function(){this.Oa?this.kb.ta(this.ad):(this.Ra.ta(this.fd),this.$a||uh(this))};
var uh=function(a){vh(a);a.tc=setInterval(function(){for(var b in a.L){var c=l.localStorage.getItem(b);c!=a.M[b]&&(a.M[b]=c,c=new Mb({type:"storage",key:b,target:window,oldValue:a.M[b],newValue:c}),a.gd(c))}},2E3)},vh=function(a){a.tc&&(clearInterval(a.tc),a.tc=null)};rh.prototype.Vb=function(){this.Oa?this.kb.Ea(this.ad):(this.Ra.Ea(this.fd),this.$a||vh(this))};
rh.prototype.gd=function(a){var b=a.Bb.key;if(this.we){var c=l.localStorage.getItem(b);a=a.Bb.newValue;a!=c&&(a?l.localStorage.setItem(b,a):a||l.localStorage.removeItem(b))}this.M[b]=l.localStorage.getItem(b);this.Nc(b)};rh.prototype.fe=function(a){w(a,q(this.Nc,this))};rh.prototype.Nc=function(a){this.L[a]&&w(this.L[a],function(a){a()})};var wh=function(a){this.B=a;this.w=th()},xh={name:"pendingRedirect",A:!1},yh=function(a){return a.w.set(xh,"pending",a.B)},zh=function(a){return a.w.remove(xh,a.B)},Ah=function(a){return a.w.get(xh,a.B).then(function(a){return"pending"==a})};var Dh=function(a,b,c){var d=this,e=(this.ua=firebase.SDK_VERSION||null)?nf(this.ua):null;this.c=new S(b,null,e);this.Qa=null;this.U=a;this.u=b;this.aa=c;this.tb=[];this.rc=!1;this.Id=q(this.Vd,this);this.Ua=new Bh(this);this.ld=new Ch(this);this.xc=new wh(this.u+":"+this.aa);this.bb={};this.bb.unknown=this.Ua;this.bb.signInViaRedirect=this.Ua;this.bb.linkViaRedirect=this.Ua;this.bb.signInViaPopup=this.ld;this.bb.linkViaPopup=this.ld;this.ue=this.Rb=null;this.qe=new H(function(a,b){d.Rb=a;d.ue=b})},
Eh=function(a){var b=bf();return jg(a).then(function(a){a:{for(var d=(b instanceof Ke?b.clone():new Ke(b,void 0)).ka,e=0;e<a.length;e++){var f;var g=a[e];f=d;var k=Pc(g);k?f=(f=Pc(f))?k.Ab(f):!1:(k=g.split(".").join("\\."),f=(new RegExp("^(.+\\."+k+"|"+k+")$","i")).test(f));if(f){a=!0;break a}}a=!1}if(!a)throw new Q("unauthorized-domain");})},Fh=function(a){a.rc||(a.rc=!0,kf().then(function(){a.be=new Ng(a.U,a.u,a.aa,a.ua);a.be.dc.push(a.Id)}));return a.qe};
Dh.prototype.subscribe=function(a){Ia(this.tb,a)||this.tb.push(a);if(!this.rc){var b=this,c=function(){var a=df(),c;(c=rf(a))||(a=a||df(),c="Safari"==ef(a)||a.toLowerCase().match(/iphone|ipad|ipod/)?!1:!0);c?Gh(b.Ua):Fh(b)};Ah(this.xc).then(function(a){a?zh(b.xc).then(function(){Fh(b)}):c()}).F(function(){c()})}};Dh.prototype.unsubscribe=function(a){La(this.tb,function(b){return b==a})};
Dh.prototype.Vd=function(a){if(!a)throw new Q("invalid-auth-event");this.Rb&&(this.Rb(),this.Rb=null);for(var b=!1,c=0;c<this.tb.length;c++){var d=this.tb[c];if(d.Oc(a.ra,a.wa)){(b=this.bb[a.ra])&&b.md(a,d);b=!0;break}}Gh(this.Ua);return b};Dh.prototype.getRedirectResult=function(){return this.Ua.getRedirectResult()};
var Ih=function(a,b,c,d,e,f){var g=Fh(a);if(f)return I();if(!b)return J(new Q("popup-blocked"));a.Qa||(a.Qa=Eh(a.c));return a.Qa.then(function(){return g}).then(function(){Hh(d);var f=Og(a.U,a.u,a.aa,c,d.providerId,d.Eb(),null,e,a.ua);Gb((b||l.window).location,f)})},Jh=function(a,b,c,d){a.Qa||(a.Qa=Eh(a.c));return a.Qa.then(function(){Hh(c);var e=Og(a.U,a.u,a.aa,b,c.providerId,c.Eb(),bf(),d,a.ua);yh(a.xc).then(function(){Gb(l.window.location,e)})})},Kh=function(a,b,c,d){var e=new Q("popup-closed-by-user");
return jf(c).then(function(){return te(3E4).then(function(){a.Fa(b,null,e,d)})})},Hh=function(a){if(!a.isOAuthProvider)throw new Q("invalid-oauth-provider");},Lh={},Mh=function(a,b,c){var d=b+":"+c;Lh[d]||(Lh[d]=new Dh(a,b,c));return Lh[d]},Bh=function(a){this.w=a;this.Cc=this.Pb=this.Va=this.T=null;this.Bc=!1};
Bh.prototype.md=function(a,b){if(!a)return J(new Q("invalid-auth-event"));this.Bc=!0;var c=a.ra,d=a.wa;"unknown"==c?(this.T||Nh(this,!1,null,null),c=I()):c=a.I?this.zc(a,b):b.hb(c,d)?this.Ac(a,b):J(new Q("invalid-auth-event"));return c};var Gh=function(a){a.Bc||(a.Bc=!0,Nh(a,!1,null,null))};Bh.prototype.zc=function(a){this.T||Nh(this,!0,null,a.getError());return I()};
Bh.prototype.Ac=function(a,b){var c=this,d=a.ra,e=b.hb(d,a.wa),f=a.cb,g=a.Tb,k="signInViaRedirect"==d||"linkViaRedirect"==d;return this.T?I():e(f,g).then(function(a){c.T||Nh(c,k,a,null)}).F(function(a){c.T||Nh(c,k,null,a)})};var Nh=function(a,b,c,d){b?d?(a.T=function(){return J(d)},a.Pb&&a.Pb(d)):(a.T=function(){return I(c)},a.Va&&a.Va(c)):(a.T=function(){return I({user:null})},a.Va&&a.Va({user:null}));a.Va=null;a.Pb=null};
Bh.prototype.getRedirectResult=function(){var a=this;this.Mc||(this.Mc=new H(function(b,c){a.T?a.T().then(b,c):(a.Va=b,a.Pb=c,Oh(a))}));return this.Mc};var Oh=function(a){var b=new Q("timeout");a.Cc&&a.Cc.cancel();a.Cc=te(3E4).then(function(){a.T||Nh(a,!0,null,b)})},Ch=function(a){this.w=a};Ch.prototype.md=function(a,b){if(!a)return J(new Q("invalid-auth-event"));var c=a.ra,d=a.wa;return a.I?this.zc(a,b):b.hb(c,d)?this.Ac(a,b):J(new Q("invalid-auth-event"))};
Ch.prototype.zc=function(a,b){b.Fa(a.ra,null,a.getError(),a.wa);return I()};Ch.prototype.Ac=function(a,b){var c=a.wa,d=a.ra;return b.hb(d,c)(a.cb,a.Tb).then(function(a){b.Fa(d,a,null,c)}).F(function(a){b.Fa(d,null,a,c)})};var Ph=function(a){this.c=a;this.Ia=this.fa=null;this.La=0};Ph.prototype.G=function(){return{apiKey:this.c.u,refreshToken:this.fa,accessToken:this.Ia,expirationTime:this.La}};var Rh=function(a,b){var c=b.idToken,d=b.refreshToken,e=Qh(b.expiresIn);a.Ia=c;a.La=e;a.fa=d},Qh=function(a){return la()+1E3*parseInt(a,10)},Sh=function(a,b){return bg(a.c,b).then(function(b){a.Ia=b.access_token;a.La=Qh(b.expires_in);a.fa=b.refresh_token;return{accessToken:a.Ia,expirationTime:a.La,refreshToken:a.fa}})};
Ph.prototype.getToken=function(a){return a||!this.Ia||la()>this.La-3E4?this.fa?Sh(this,{grant_type:"refresh_token",refresh_token:this.fa}):I(null):I({accessToken:this.Ia,expirationTime:this.La,refreshToken:this.fa})};var Th=function(a,b,c,d,e){wf(this,{uid:a,displayName:d||null,photoURL:e||null,email:c||null,providerId:b})},Uh=function(a,b){Lb.call(this,a);for(var c in b)this[c]=b[c]};r(Uh,Lb);
var V=function(a,b,c){this.S=[];this.u=a.apiKey;this.aa=a.appName;this.U=a.authDomain||null;a=firebase.SDK_VERSION?nf(firebase.SDK_VERSION):null;this.c=new S(this.u,null,a);this.qa=new Ph(this.c);Vh(this,b.idToken);Rh(this.qa,b);P(this,"refreshToken",this.qa.fa);Wh(this,c||{});Wd.call(this);this.Mb=!1;this.U&&qf()&&(this.s=Mh(this.U,this.u,this.aa));this.Ub=[]};r(V,Wd);
var Vh=function(a,b){a.cd=b;P(a,"_lat",b)},Xh=function(a,b){La(a.Ub,function(a){return a==b})},Yh=function(a){for(var b=[],c=0;c<a.Ub.length;c++)b.push(a.Ub[c](a));return sd(b).then(function(){return a})},Zh=function(a){a.s&&!a.Mb&&(a.Mb=!0,a.s.subscribe(a))},Wh=function(a,b){wf(a,{uid:b.uid,displayName:b.displayName||null,photoURL:b.photoURL||null,email:b.email||null,emailVerified:b.emailVerified||!1,isAnonymous:b.isAnonymous||!1,providerData:[]})};P(V.prototype,"providerId","firebase");
var $h=function(){},ai=function(a){return I().then(function(){if(a.Nd)throw new Q("app-deleted");})},bi=function(a){return Ea(a.providerData,function(a){return a.providerId})},di=function(a,b){b&&(ci(a,b.providerId),a.providerData.push(b))},ci=function(a,b){La(a.providerData,function(a){return a.providerId==b})},ei=function(a,b,c){("uid"!=b||c)&&a.hasOwnProperty(b)&&P(a,b,c)};
V.prototype.copy=function(a){var b=this;b!=a&&(wf(this,{uid:a.uid,displayName:a.displayName,photoURL:a.photoURL,email:a.email,emailVerified:a.emailVerified,isAnonymous:a.isAnonymous,providerData:[]}),w(a.providerData,function(a){di(b,a)}),this.qa=a.qa,P(this,"refreshToken",this.qa.fa))};V.prototype.reload=function(){var a=this;return ai(this).then(function(){return fi(a).then(function(){return Yh(a)}).then($h)})};
var fi=function(a){return a.getToken().then(function(b){var c=a.isAnonymous;return gi(a,b).then(function(){c||ei(a,"isAnonymous",!1);return b}).F(function(b){"auth/user-token-expired"==b.code&&(a.dispatchEvent(new Uh("userDeleted")),hi(a));throw b;})})};V.prototype.getToken=function(a){var b=this;return ai(this).then(function(){return b.qa.getToken(a)}).then(function(a){if(!a)throw new Q("internal-error");a.accessToken!=b.cd&&(Vh(b,a.accessToken),b.la());ei(b,"refreshToken",a.refreshToken);return a.accessToken})};
var ii=function(a,b){b.idToken&&a.cd!=b.idToken&&(Rh(a.qa,b),a.la(),Vh(a,b.idToken))};V.prototype.la=function(){this.dispatchEvent(new Uh("tokenChanged"))};var gi=function(a,b){return R(a.c,Bg,{idToken:b}).then(q(a.se,a))};
V.prototype.se=function(a){a=a.users;if(!a||!a.length)throw new Q("internal-error");a=a[0];Wh(this,{uid:a.localId,displayName:a.displayName,photoURL:a.photoUrl,email:a.email,emailVerified:!!a.emailVerified});for(var b=ji(a),c=0;c<b.length;c++)di(this,b[c]);ei(this,"isAnonymous",!(this.email&&a.passwordHash)&&!(this.providerData&&this.providerData.length))};
var ji=function(a){return(a=a.providerUserInfo)&&a.length?Ea(a,function(a){return new Th(a.rawId,a.providerId,a.email,a.displayName,a.photoUrl)}):[]};V.prototype.reauthenticate=function(a){var b=this;return this.f(a.Db(this.c).then(function(a){var d;a:{var e=a.idToken.split(".");if(3==e.length){for(var e=e[1],f=(4-e.length%4)%4,g=0;g<f;g++)e+=".";try{var k=lc(tb(e));if(k.sub&&k.iss&&k.aud&&k.exp){d=new Df(k);break a}}catch(p){}}d=null}if(!d||b.uid!=d.ke)throw new Q("user-mismatch");ii(b,a);return b.reload()}))};
var ki=function(a,b){return fi(a).then(function(){if(Ia(bi(a),b))return Yh(a).then(function(){throw new Q("provider-already-linked");})})};h=V.prototype;h.link=function(a){var b=this;return this.f(ki(this,a.provider).then(function(){return b.getToken()}).then(function(c){return a.ed(b.c,c)}).then(q(this.Uc,this)))};h.Uc=function(a){ii(this,a);var b=this;return this.reload().then(function(){return b})};
h.updateEmail=function(a){var b=this;return this.f(this.getToken().then(function(c){return b.c.updateEmail(c,a)}).then(function(a){ii(b,a);return b.reload()}))};h.updatePassword=function(a){var b=this;return this.f(this.getToken().then(function(c){return b.c.updatePassword(c,a)}).then(function(a){ii(b,a);return b.reload()}))};
h.updateProfile=function(a){if(void 0===a.displayName&&void 0===a.photoURL)return ai(this);var b=this;return this.f(this.getToken().then(function(c){return b.c.updateProfile(c,{displayName:a.displayName,photoUrl:a.photoURL})}).then(function(a){ii(b,a);ei(b,"displayName",a.displayName||null);ei(b,"photoURL",a.photoUrl||null);return Yh(b)}).then($h))};
h.unlink=function(a){var b=this;return this.f(fi(this).then(function(c){return Ia(bi(b),a)?rg(b.c,c,[a]).then(function(a){var c={};w(a.providerUserInfo||[],function(a){c[a.providerId]=!0});w(bi(b),function(a){c[a]||ci(b,a)});return Yh(b)}):Yh(b).then(function(){throw new Q("no-such-provider");})}))};h["delete"]=function(){var a=this;return this.f(this.getToken().then(function(b){return R(a.c,Ag,{idToken:b})}).then(function(){a.dispatchEvent(new Uh("userDeleted"))})).then(function(){hi(a)})};
h.Oc=function(a,b){return"linkViaPopup"==a&&(this.da||null)==b&&this.X||"linkViaRedirect"==a&&(this.Ob||null)==b?!0:!1};h.Fa=function(a,b,c,d){"linkViaPopup"==a&&d==(this.da||null)&&(c&&this.Ba?this.Ba(c):b&&!c&&this.X&&this.X(b),this.Ca&&(this.Ca.cancel(),this.Ca=null),delete this.X,delete this.Ba)};h.hb=function(a,b){return"linkViaPopup"==a&&b==(this.da||null)||"linkViaRedirect"==a&&(this.Ob||null)==b?q(this.Qd,this):null};h.Cb=function(){return pf(this.uid+":::")};
h.linkWithPopup=function(a){if(!qf())return J(new Q("operation-not-supported-in-this-environment"));var b=this,c=Af(a.providerId),d=this.Cb(),e=null;!rf()&&this.U&&a.isOAuthProvider&&(e=Og(this.U,this.u,this.aa,"linkViaPopup",a.providerId,a.Eb(),null,d,firebase.SDK_VERSION||null));var f=hf(e,c&&c.rb,c&&c.qb),c=ki(this,a.providerId).then(function(){return Yh(b)}).then(function(){li(b);return b.getToken()}).then(function(){return Ih(b.s,f,"linkViaPopup",a,d,!!e)}).then(function(){return new H(function(a,
c){b.Fa("linkViaPopup",null,new Q("cancelled-popup-request"),b.da||null);b.X=a;b.Ba=c;b.da=d;b.Ca=Kh(b,"linkViaPopup",f,d)})}).then(function(a){f&&gf(f);return a}).F(function(a){f&&gf(f);throw a;});return this.f(c)};
h.linkWithRedirect=function(a){if(!qf())return J(new Q("operation-not-supported-in-this-environment"));var b=this,c=null,d=this.Cb(),e=ki(this,a.providerId).then(function(){li(b);return b.getToken()}).then(function(){b.Ob=d;return Yh(b)}).then(function(a){b.Da&&(a=b.Da,a=a.w.set(mi,b.G(),a.B));return a}).then(function(){return Jh(b.s,"linkViaRedirect",a,d)}).F(function(a){c=a;if(b.Da)return ni(b.Da);throw c;}).then(function(){if(c)throw c;});return this.f(e)};
var li=function(a){if(a.s&&a.Mb)return;if(a.s&&!a.Mb)throw new Q("internal-error");throw new Q("auth-domain-config-required");};V.prototype.Qd=function(a,b){var c=this,d=null,e=this.getToken().then(function(d){return R(c.c,Hf,{requestUri:a,sessionId:b,idToken:d})}).then(function(a){d=Sf(a);return c.Uc(a)}).then(function(a){return{user:a,credential:d}});return this.f(e)};
V.prototype.sendEmailVerification=function(){var a=this;return this.f(this.getToken().then(function(b){return a.c.sendEmailVerification(b)}).then(function(b){if(a.email!=b)return a.reload()}).then(function(){}))};var hi=function(a){for(var b=0;b<a.S.length;b++)a.S[b].cancel("app-deleted");a.S=[];a.Nd=!0;P(a,"refreshToken",null);a.s&&a.s.unsubscribe(a)};V.prototype.f=function(a){var b=this;this.S.push(a);vd(a,function(){Ka(b.S,a)});return a};V.prototype.toJSON=function(){return this.G()};
V.prototype.G=function(){var a={uid:this.uid,displayName:this.displayName,photoURL:this.photoURL,email:this.email,emailVerified:this.emailVerified,isAnonymous:this.isAnonymous,providerData:[],apiKey:this.u,appName:this.aa,authDomain:this.U,stsTokenManager:this.qa.G(),redirectEventId:this.Ob||null};w(this.providerData,function(b){a.providerData.push(xf(b))});return a};
var oi=function(a){if(!a.apiKey)return null;var b={apiKey:a.apiKey,authDomain:a.authDomain,appName:a.appName},c={};if(a.stsTokenManager&&a.stsTokenManager.accessToken&&a.stsTokenManager.refreshToken&&a.stsTokenManager.expirationTime)c.idToken=a.stsTokenManager.accessToken,c.refreshToken=a.stsTokenManager.refreshToken,c.expiresIn=(a.stsTokenManager.expirationTime-la())/1E3;else return null;var d=new V(b,c,a);a.providerData&&w(a.providerData,function(a){if(a){var b={};wf(b,a);di(d,b)}});a.redirectEventId&&
(d.Ob=a.redirectEventId);return d},pi=function(a,b,c){var d=new V(a,b);c&&(d.Da=c);return d.reload().then(function(){return d})};var qi=function(a){this.B=a;this.w=th()},mi={name:"redirectUser",A:!1},ni=function(a){return a.w.remove(mi,a.B)},ri=function(a,b){return a.w.get(mi,a.B).then(function(a){a&&b&&(a.authDomain=b);return oi(a||{})})};var si=function(a){this.B=a;this.w=th()},ti={name:"authUser",A:!0},ui=function(a){return a.w.remove(ti,a.B)},vi=function(a,b){return a.w.get(ti,a.B).then(function(a){a&&b&&(a.authDomain=b);return oi(a||{})})};var X=function(a){this.ic=!1;P(this,"app",a);if(W(this).options&&W(this).options.apiKey)a=firebase.SDK_VERSION?nf(firebase.SDK_VERSION):null,this.c=new S(W(this).options&&W(this).options.apiKey,null,a);else throw new Q("invalid-api-key");this.S=[];this.fb=[];this.oe=firebase.INTERNAL.createSubscribe(q(this.ge,this));wi(this,null);this.sa=new si(W(this).options.apiKey+":"+W(this).name);this.Wa=new qi(W(this).options.apiKey+":"+W(this).name);this.P=this.f(xi(this));this.mb=!1;this.Xc=q(this.Be,this);
this.vd=q(this.Na,this);this.wd=q(this.$d,this);this.ud=q(this.Zd,this);yi(this);this.INTERNAL={};this.INTERNAL["delete"]=q(this["delete"],this)};X.prototype.toJSON=function(){return{apiKey:W(this).options.apiKey,authDomain:W(this).options.authDomain,appName:W(this).name,currentUser:Z(this)&&Z(this).G()}};
var zi=function(a){return a.Od||J(new Q("auth-domain-config-required"))},yi=function(a){var b=W(a).options.authDomain,c=W(a).options.apiKey;b&&qf()&&(a.Od=a.P.then(function(){a.s=Mh(b,c,W(a).name);a.s.subscribe(a);Z(a)&&Zh(Z(a));a.Dc&&(Zh(a.Dc),a.Dc=null);return a.s}))};h=X.prototype;h.Oc=function(a,b){switch(a){case "unknown":case "signInViaRedirect":return!0;case "signInViaPopup":return this.da==b&&!!this.X;default:return!1}};
h.Fa=function(a,b,c,d){"signInViaPopup"==a&&this.da==d&&(c&&this.Ba?this.Ba(c):b&&!c&&this.X&&this.X(b),this.Ca&&(this.Ca.cancel(),this.Ca=null),delete this.X,delete this.Ba)};h.hb=function(a,b){return"signInViaRedirect"==a||"signInViaPopup"==a&&this.da==b&&this.X?q(this.Rd,this):null};
h.Rd=function(a,b){var c=this,d=null,e=Ff(c.c,{requestUri:a,sessionId:b}).then(function(a){d=Sf(a);return a}),f=c.P.then(function(){return e}).then(function(a){return Ai(c,a)}).then(function(){return{user:Z(c),credential:d}});return this.f(f)};h.Cb=function(){return pf()};
h.signInWithPopup=function(a){if(!qf())return J(new Q("operation-not-supported-in-this-environment"));var b=this,c=Af(a.providerId),d=this.Cb(),e=null;!rf()&&W(this).options.authDomain&&a.isOAuthProvider&&(e=Og(W(this).options.authDomain,W(this).options.apiKey,W(this).name,"signInViaPopup",a.providerId,a.Eb(),null,d,firebase.SDK_VERSION||null));var f=hf(e,c&&c.rb,c&&c.qb),c=zi(this).then(function(b){return Ih(b,f,"signInViaPopup",a,d,!!e)}).then(function(){return new H(function(a,c){b.Fa("signInViaPopup",
null,new Q("cancelled-popup-request"),b.da);b.X=a;b.Ba=c;b.da=d;b.Ca=Kh(b,"signInViaPopup",f,d)})}).then(function(a){f&&gf(f);return a}).F(function(a){f&&gf(f);throw a;});return this.f(c)};h.signInWithRedirect=function(a){if(!qf())return J(new Q("operation-not-supported-in-this-environment"));var b=this,c=zi(this).then(function(){return Jh(b.s,"signInViaRedirect",a)});return this.f(c)};
h.getRedirectResult=function(){if(!qf())return J(new Q("operation-not-supported-in-this-environment"));var a=this,b=zi(this).then(function(){return a.s.getRedirectResult()});return this.f(b)};
var Ai=function(a,b){var c={};c.apiKey=W(a).options.apiKey;c.authDomain=W(a).options.authDomain;c.appName=W(a).name;return a.P.then(function(){return pi(c,b,a.Wa)}).then(function(b){if(Z(a)&&b.uid==Z(a).uid)return Z(a).copy(b),a.Na(b);wi(a,b);Zh(b);return a.Na(b)}).then(function(){a.la()})},wi=function(a,b){Z(a)&&(Xh(Z(a),a.vd),fc(Z(a),"tokenChanged",a.wd),fc(Z(a),"userDeleted",a.ud));b&&(b.Ub.push(a.vd),Xb(b,"tokenChanged",a.wd),Xb(b,"userDeleted",a.ud));P(a,"currentUser",b)};
X.prototype.signOut=function(){var a=this,b=this.P.then(function(){if(!Z(a))return I();wi(a,null);return ui(a.sa).then(function(){a.la()})});return this.f(b)};
var Bi=function(a){var b=ri(a.Wa,W(a).options.authDomain).then(function(b){if(a.Dc=b)b.Da=a.Wa;return ni(a.Wa)});return a.f(b)},xi=function(a){var b=W(a).options.authDomain,c=vd(Bi(a).then(function(){return vi(a.sa,b)}).then(function(b){return b?(b.Da=a.Wa,b.reload().then(function(){return b}).F(function(c){return"auth/network-request-failed"==c.code?b:ui(a.sa)})):null}).then(function(b){wi(a,b||null);a.mb=!0;a.la()}),function(){if(!a.ic){a.mb=!0;var b=a.sa;b.w.addListener(ti,b.B,a.Xc)}});return a.f(c)};
X.prototype.Be=function(){var a=this;return vi(this.sa,W(this).options.authDomain).then(function(b){if(!a.ic){var c;if(c=Z(a)&&b){c=Z(a).uid;var d=b.uid;c=void 0===c||null===c||""===c||void 0===d||null===d||""===d?!1:c==d}if(c)return Z(a).copy(b),Z(a).getToken();wi(a,b);b&&(Zh(b),b.Da=a.Wa);a.s.subscribe(a);a.la()}})};X.prototype.Na=function(a){var b=this.sa;return b.w.set(ti,a.G(),b.B)};X.prototype.$d=function(){this.mb=!0;this.la();this.Na(Z(this))};X.prototype.Zd=function(){this.signOut()};
var Ci=function(a,b){return a.f(b.then(function(b){return Ai(a,b)}).then(function(){return Z(a)}))};h=X.prototype;h.ge=function(a){var b=this;this.addAuthTokenListener(function(){a.next(Z(b))})};h.onAuthStateChanged=function(a,b,c){var d=this;this.mb&&firebase.Promise.resolve().then(function(){n(a)?a(Z(d)):n(a.next)&&a.next(Z(d))});return this.oe(a,b,c)};h.getToken=function(a){var b=this,c=this.P.then(function(){return Z(b)?Z(b).getToken(a).then(function(a){return{accessToken:a}}):null});return this.f(c)};
h.signInWithCustomToken=function(a){var b=this;return this.P.then(function(){return Ci(b,R(b.c,Cg,{token:a}))}).then(function(a){ei(a,"isAnonymous",!1);return b.Na(a)}).then(function(){return Z(b)})};h.signInWithEmailAndPassword=function(a,b){var c=this;return this.P.then(function(){return Ci(c,R(c.c,Of,{email:a,password:b}))})};h.createUserWithEmailAndPassword=function(a,b){var c=this;return this.P.then(function(){return Ci(c,R(c.c,zg,{email:a,password:b}))})};
h.signInWithCredential=function(a){var b=this;return this.P.then(function(){return Ci(b,a.Db(b.c))})};h.signInAnonymously=function(){var a=Z(this),b=this;return a&&a.isAnonymous?I(a):this.P.then(function(){return Ci(b,b.c.signInAnonymously())}).then(function(a){ei(a,"isAnonymous",!0);return b.Na(a)}).then(function(){return Z(b)})};var W=function(a){return a.app},Z=function(a){return a.currentUser};h=X.prototype;
h.la=function(){for(var a=0;a<this.fb.length;a++)if(this.fb[a])this.fb[a](Z(this)&&Z(this)._lat||null)};h.addAuthTokenListener=function(a){this.fb.push(a);var b=this;this.mb&&this.P.then(function(){a(Z(b)&&Z(b)._lat||null)})};h.removeAuthTokenListener=function(a){La(this.fb,function(b){return b==a})};h["delete"]=function(){this.ic=!0;for(var a=0;a<this.S.length;a++)this.S[a].cancel("app-deleted");this.S=[];this.sa&&(a=this.sa,a.w.removeListener(ti,a.B,this.Xc));this.s&&this.s.unsubscribe(this)};
h.f=function(a){var b=this;this.S.push(a);vd(a,function(){Ka(b.S,a)});return a};h.fetchProvidersForEmail=function(a){return this.f(hg(this.c,a))};h.verifyPasswordResetCode=function(a){return this.checkActionCode(a).then(function(a){return a.data.email})};h.confirmPasswordReset=function(a,b){return this.f(this.c.confirmPasswordReset(a,b).then(function(){}))};h.checkActionCode=function(a){return this.f(this.c.checkActionCode(a).then(function(a){return{data:{email:a.email}}}))};h.applyActionCode=function(a){return this.f(this.c.applyActionCode(a).then(function(){}))};
h.sendPasswordResetEmail=function(a){return this.f(this.c.sendPasswordResetEmail(a).then(function(){}))};ih(X.prototype,{applyActionCode:{name:"applyActionCode",b:[T("code")]},checkActionCode:{name:"checkActionCode",b:[T("code")]},confirmPasswordReset:{name:"confirmPasswordReset",b:[T("code"),T("newPassword")]},createUserWithEmailAndPassword:{name:"createUserWithEmailAndPassword",b:[T("email"),T("password")]},fetchProvidersForEmail:{name:"fetchProvidersForEmail",b:[T("email")]},getRedirectResult:{name:"getRedirectResult",b:[]},onAuthStateChanged:{name:"onAuthStateChanged",b:[gh(bh(),ch(),"nextOrObserver"),
ch("opt_error",!0),ch("opt_completed",!0)]},sendPasswordResetEmail:{name:"sendPasswordResetEmail",b:[T("email")]},signInAnonymously:{name:"signInAnonymously",b:[]},signInWithCredential:{name:"signInWithCredential",b:[eh()]},signInWithCustomToken:{name:"signInWithCustomToken",b:[T("token")]},signInWithEmailAndPassword:{name:"signInWithEmailAndPassword",b:[T("email"),T("password")]},signInWithPopup:{name:"signInWithPopup",b:[fh()]},signInWithRedirect:{name:"signInWithRedirect",b:[fh()]},signOut:{name:"signOut",
b:[]},toJSON:{name:"toJSON",b:[T(null,!0)]},verifyPasswordResetCode:{name:"verifyPasswordResetCode",b:[T("code")]}});
ih(V.prototype,{"delete":{name:"delete",b:[]},getToken:{name:"getToken",b:[{name:"opt_forceRefresh",Z:"a boolean",optional:!0,$:function(a){return"boolean"==typeof a}}]},link:{name:"link",b:[eh()]},linkWithPopup:{name:"linkWithPopup",b:[fh()]},linkWithRedirect:{name:"linkWithRedirect",b:[fh()]},reauthenticate:{name:"reauthenticate",b:[eh()]},reload:{name:"reload",b:[]},sendEmailVerification:{name:"sendEmailVerification",b:[]},toJSON:{name:"toJSON",b:[T(null,!0)]},unlink:{name:"unlink",b:[T("provider")]},
updateEmail:{name:"updateEmail",b:[T("email")]},updatePassword:{name:"updatePassword",b:[T("password")]},updateProfile:{name:"updateProfile",b:[bh("profile")]}});ih(H.prototype,{F:{name:"catch"},then:{name:"then"}});U(Qf,"credential",function(a,b){return new Nf(a,b)},[T("email"),T("password")]);ih(Jf.prototype,{addScope:{name:"addScope",b:[T("scope")]}});U(Jf,"credential",Jf.credential,[gh(T(),bh(),"token")]);ih(Kf.prototype,{addScope:{name:"addScope",b:[T("scope")]}});
U(Kf,"credential",Kf.credential,[gh(T(),bh(),"token")]);ih(Lf.prototype,{addScope:{name:"addScope",b:[T("scope")]}});U(Lf,"credential",Lf.credential,[gh(T(),gh(bh(),dh()),"idToken"),gh(T(),dh(),"accessToken",!0)]);U(Mf,"credential",Mf.credential,[gh(T(),bh(),"token"),T("secret",!0)]);
(function(){if("undefined"!==typeof firebase&&firebase.INTERNAL&&firebase.INTERNAL.registerService){var a={Auth:X,Error:Q};U(a,"EmailAuthProvider",Qf,[]);U(a,"FacebookAuthProvider",Jf,[]);U(a,"GithubAuthProvider",Kf,[]);U(a,"GoogleAuthProvider",Lf,[]);U(a,"TwitterAuthProvider",Mf,[]);firebase.INTERNAL.registerService("auth",function(a,c){var d=new X(a);c({INTERNAL:{getToken:q(d.getToken,d),addAuthTokenListener:q(d.addAuthTokenListener,d),removeAuthTokenListener:q(d.removeAuthTokenListener,d)}});return d},
a);firebase.INTERNAL.registerAppHook(function(a,c){"create"===a&&c.auth()});firebase.INTERNAL.extendNamespace({User:V})}else throw Error("Cannot find the firebase namespace; be sure to include firebase-app.js before this library.");})();})();
(function() {var g,n=this;function p(a){return void 0!==a}function aa(){}function ba(a){a.Wb=function(){return a.af?a.af:a.af=new a}}
function ca(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function da(a){return"array"==ca(a)}function ea(a){var b=ca(a);return"array"==b||"object"==b&&"number"==typeof a.length}function q(a){return"string"==typeof a}function fa(a){return"number"==typeof a}function ga(a){return"function"==ca(a)}function ha(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ia(a,b,c){return a.call.apply(a.bind,arguments)}
function ja(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function r(a,b,c){r=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ia:ja;return r.apply(null,arguments)}
function ka(a,b){function c(){}c.prototype=b.prototype;a.Fg=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Cg=function(a,c,f){for(var h=Array(arguments.length-2),k=2;k<arguments.length;k++)h[k-2]=arguments[k];return b.prototype[c].apply(a,h)}};function t(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function la(a,b){var c={},d;for(d in a)c[d]=b.call(void 0,a[d],d,a);return c}function ma(a,b){for(var c in a)if(!b.call(void 0,a[c],c,a))return!1;return!0}function na(a){var b=0,c;for(c in a)b++;return b}function oa(a){for(var b in a)return b}function pa(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function qa(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}function ra(a,b){for(var c in a)if(a[c]==b)return!0;return!1}
function sa(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d}function ta(a,b){var c=sa(a,b,void 0);return c&&a[c]}function ua(a){for(var b in a)return!1;return!0}function va(a){var b={},c;for(c in a)b[c]=a[c];return b};function wa(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);}function xa(){this.Fd=void 0}
function ya(a,b,c){switch(typeof b){case "string":za(b,c);break;case "number":c.push(isFinite(b)&&!isNaN(b)?b:"null");break;case "boolean":c.push(b);break;case "undefined":c.push("null");break;case "object":if(null==b){c.push("null");break}if(da(b)){var d=b.length;c.push("[");for(var e="",f=0;f<d;f++)c.push(e),e=b[f],ya(a,a.Fd?a.Fd.call(b,String(f),e):e,c),e=",";c.push("]");break}c.push("{");d="";for(f in b)Object.prototype.hasOwnProperty.call(b,f)&&(e=b[f],"function"!=typeof e&&(c.push(d),za(f,c),
c.push(":"),ya(a,a.Fd?a.Fd.call(b,f,e):e,c),d=","));c.push("}");break;case "function":break;default:throw Error("Unknown type: "+typeof b);}}var Aa={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"},Ba=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
function za(a,b){b.push('"',a.replace(Ba,function(a){if(a in Aa)return Aa[a];var b=a.charCodeAt(0),e="\\u";16>b?e+="000":256>b?e+="00":4096>b&&(e+="0");return Aa[a]=e+b.toString(16)}),'"')};var v;a:{var Ca=n.navigator;if(Ca){var Da=Ca.userAgent;if(Da){v=Da;break a}}v=""};function Ea(a){if(Error.captureStackTrace)Error.captureStackTrace(this,Ea);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}ka(Ea,Error);Ea.prototype.name="CustomError";var w=Array.prototype,Fa=w.indexOf?function(a,b,c){return w.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(q(a))return q(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},Ga=w.forEach?function(a,b,c){w.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},Ha=w.filter?function(a,b,c){return w.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,h=q(a)?
a.split(""):a,k=0;k<d;k++)if(k in h){var m=h[k];b.call(c,m,k,a)&&(e[f++]=m)}return e},Ia=w.map?function(a,b,c){return w.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=q(a)?a.split(""):a,h=0;h<d;h++)h in f&&(e[h]=b.call(c,f[h],h,a));return e},Ja=w.reduce?function(a,b,c,d){for(var e=[],f=1,h=arguments.length;f<h;f++)e.push(arguments[f]);d&&(e[0]=r(b,d));return w.reduce.apply(a,e)}:function(a,b,c,d){var e=c;Ga(a,function(c,h){e=b.call(d,e,c,h,a)});return e},Ka=w.every?function(a,b,
c){return w.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};function La(a,b){var c=Ma(a,b,void 0);return 0>c?null:q(a)?a.charAt(c):a[c]}function Ma(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1}function Na(a,b){var c=Fa(a,b);0<=c&&w.splice.call(a,c,1)}function Oa(a,b,c){return 2>=arguments.length?w.slice.call(a,b):w.slice.call(a,b,c)}
function Pa(a,b){a.sort(b||Qa)}function Qa(a,b){return a>b?1:a<b?-1:0};var Ra=-1!=v.indexOf("Opera")||-1!=v.indexOf("OPR"),Sa=-1!=v.indexOf("Trident")||-1!=v.indexOf("MSIE"),Ta=-1!=v.indexOf("Gecko")&&-1==v.toLowerCase().indexOf("webkit")&&!(-1!=v.indexOf("Trident")||-1!=v.indexOf("MSIE")),Ua=-1!=v.toLowerCase().indexOf("webkit");
(function(){var a="",b;if(Ra&&n.opera)return a=n.opera.version,ga(a)?a():a;Ta?b=/rv\:([^\);]+)(\)|;)/:Sa?b=/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/:Ua&&(b=/WebKit\/(\S+)/);b&&(a=(a=b.exec(v))?a[1]:"");return Sa&&(b=(b=n.document)?b.documentMode:void 0,b>parseFloat(a))?String(b):a})();function Va(a){n.setTimeout(function(){throw a;},0)}var Wa;
function Xa(){var a=n.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&-1==v.indexOf("Presto")&&(a=function(){var a=document.createElement("iframe");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+"//"+b.location.host,a=r(function(a){if(("*"==d||a.origin==
d)&&a.data==c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&-1==v.indexOf("Trident")&&-1==v.indexOf("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(p(c.next)){c=c.next;var a=c.Le;c.Le=null;a()}};return function(a){d.next={Le:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("script")?function(a){var b=
document.createElement("script");b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){n.setTimeout(a,0)}};function Ya(a,b){Za||$a();ab||(Za(),ab=!0);bb.push(new cb(a,b))}var Za;function $a(){if(n.Promise&&n.Promise.resolve){var a=n.Promise.resolve();Za=function(){a.then(db)}}else Za=function(){var a=db;!ga(n.setImmediate)||n.Window&&n.Window.prototype&&n.Window.prototype.setImmediate==n.setImmediate?(Wa||(Wa=Xa()),Wa(a)):n.setImmediate(a)}}var ab=!1,bb=[];[].push(function(){ab=!1;bb=[]});
function db(){for(;bb.length;){var a=bb;bb=[];for(var b=0;b<a.length;b++){var c=a[b];try{c.Vf.call(c.scope)}catch(d){Va(d)}}}ab=!1}function cb(a,b){this.Vf=a;this.scope=b};function eb(a,b){this.L=fb;this.tf=void 0;this.Ca=this.Ha=null;this.jd=this.be=!1;if(a==gb)hb(this,ib,b);else try{var c=this;a.call(b,function(a){hb(c,ib,a)},function(a){if(!(a instanceof jb))try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}hb(c,kb,a)})}catch(d){hb(this,kb,d)}}var fb=0,ib=2,kb=3;function gb(){}eb.prototype.then=function(a,b,c){return lb(this,ga(a)?a:null,ga(b)?b:null,c)};eb.prototype.then=eb.prototype.then;eb.prototype.$goog_Thenable=!0;g=eb.prototype;
g.yg=function(a,b){return lb(this,null,a,b)};g.cancel=function(a){this.L==fb&&Ya(function(){var b=new jb(a);mb(this,b)},this)};function mb(a,b){if(a.L==fb)if(a.Ha){var c=a.Ha;if(c.Ca){for(var d=0,e=-1,f=0,h;h=c.Ca[f];f++)if(h=h.m)if(d++,h==a&&(e=f),0<=e&&1<d)break;0<=e&&(c.L==fb&&1==d?mb(c,b):(d=c.Ca.splice(e,1)[0],nb(c,d,kb,b)))}a.Ha=null}else hb(a,kb,b)}function ob(a,b){a.Ca&&a.Ca.length||a.L!=ib&&a.L!=kb||pb(a);a.Ca||(a.Ca=[]);a.Ca.push(b)}
function lb(a,b,c,d){var e={m:null,gf:null,jf:null};e.m=new eb(function(a,h){e.gf=b?function(c){try{var e=b.call(d,c);a(e)}catch(l){h(l)}}:a;e.jf=c?function(b){try{var e=c.call(d,b);!p(e)&&b instanceof jb?h(b):a(e)}catch(l){h(l)}}:h});e.m.Ha=a;ob(a,e);return e.m}g.Bf=function(a){this.L=fb;hb(this,ib,a)};g.Cf=function(a){this.L=fb;hb(this,kb,a)};
function hb(a,b,c){if(a.L==fb){if(a==c)b=kb,c=new TypeError("Promise cannot resolve to itself");else{var d;if(c)try{d=!!c.$goog_Thenable}catch(e){d=!1}else d=!1;if(d){a.L=1;c.then(a.Bf,a.Cf,a);return}if(ha(c))try{var f=c.then;if(ga(f)){qb(a,c,f);return}}catch(h){b=kb,c=h}}a.tf=c;a.L=b;a.Ha=null;pb(a);b!=kb||c instanceof jb||rb(a,c)}}function qb(a,b,c){function d(b){f||(f=!0,a.Cf(b))}function e(b){f||(f=!0,a.Bf(b))}a.L=1;var f=!1;try{c.call(b,e,d)}catch(h){d(h)}}
function pb(a){a.be||(a.be=!0,Ya(a.Tf,a))}g.Tf=function(){for(;this.Ca&&this.Ca.length;){var a=this.Ca;this.Ca=null;for(var b=0;b<a.length;b++)nb(this,a[b],this.L,this.tf)}this.be=!1};function nb(a,b,c,d){if(c==ib)b.gf(d);else{if(b.m)for(;a&&a.jd;a=a.Ha)a.jd=!1;b.jf(d)}}function rb(a,b){a.jd=!0;Ya(function(){a.jd&&sb.call(null,b)})}var sb=Va;function jb(a){Ea.call(this,a)}ka(jb,Ea);jb.prototype.name="cancel";var tb=null,ub=null,vb=null;function wb(a,b){if(!ea(a))throw Error("encodeByteArray takes an array as a parameter");xb();for(var c=b?ub:tb,d=[],e=0;e<a.length;e+=3){var f=a[e],h=e+1<a.length,k=h?a[e+1]:0,m=e+2<a.length,l=m?a[e+2]:0,u=f>>2,f=(f&3)<<4|k>>4,k=(k&15)<<2|l>>6,l=l&63;m||(l=64,h||(k=64));d.push(c[u],c[f],c[k],c[l])}return d.join("")}
function xb(){if(!tb){tb={};ub={};vb={};for(var a=0;65>a;a++)tb[a]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a),ub[a]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(a),vb[ub[a]]=a,62<=a&&(vb["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(a)]=a)}};function yb(){this.Ya=-1};function zb(){this.Ya=-1;this.Ya=64;this.N=[];this.Wd=[];this.If=[];this.zd=[];this.zd[0]=128;for(var a=1;a<this.Ya;++a)this.zd[a]=0;this.Pd=this.ac=0;this.reset()}ka(zb,yb);zb.prototype.reset=function(){this.N[0]=1732584193;this.N[1]=4023233417;this.N[2]=2562383102;this.N[3]=271733878;this.N[4]=3285377520;this.Pd=this.ac=0};
function Ab(a,b,c){c||(c=0);var d=a.If;if(q(b))for(var e=0;16>e;e++)d[e]=b.charCodeAt(c)<<24|b.charCodeAt(c+1)<<16|b.charCodeAt(c+2)<<8|b.charCodeAt(c+3),c+=4;else for(e=0;16>e;e++)d[e]=b[c]<<24|b[c+1]<<16|b[c+2]<<8|b[c+3],c+=4;for(e=16;80>e;e++){var f=d[e-3]^d[e-8]^d[e-14]^d[e-16];d[e]=(f<<1|f>>>31)&4294967295}b=a.N[0];c=a.N[1];for(var h=a.N[2],k=a.N[3],m=a.N[4],l,e=0;80>e;e++)40>e?20>e?(f=k^c&(h^k),l=1518500249):(f=c^h^k,l=1859775393):60>e?(f=c&h|k&(c|h),l=2400959708):(f=c^h^k,l=3395469782),f=(b<<
5|b>>>27)+f+m+l+d[e]&4294967295,m=k,k=h,h=(c<<30|c>>>2)&4294967295,c=b,b=f;a.N[0]=a.N[0]+b&4294967295;a.N[1]=a.N[1]+c&4294967295;a.N[2]=a.N[2]+h&4294967295;a.N[3]=a.N[3]+k&4294967295;a.N[4]=a.N[4]+m&4294967295}
zb.prototype.update=function(a,b){if(null!=a){p(b)||(b=a.length);for(var c=b-this.Ya,d=0,e=this.Wd,f=this.ac;d<b;){if(0==f)for(;d<=c;)Ab(this,a,d),d+=this.Ya;if(q(a))for(;d<b;){if(e[f]=a.charCodeAt(d),++f,++d,f==this.Ya){Ab(this,e);f=0;break}}else for(;d<b;)if(e[f]=a[d],++f,++d,f==this.Ya){Ab(this,e);f=0;break}}this.ac=f;this.Pd+=b}};function x(a,b,c,d){var e;d<b?e="at least "+b:d>c&&(e=0===c?"none":"no more than "+c);if(e)throw Error(a+" failed: Was called with "+d+(1===d?" argument.":" arguments.")+" Expects "+e+".");}function Bb(a,b,c){var d="";switch(b){case 1:d=c?"first":"First";break;case 2:d=c?"second":"Second";break;case 3:d=c?"third":"Third";break;case 4:d=c?"fourth":"Fourth";break;default:throw Error("errorPrefix called with argumentNumber > 4.  Need to update it?");}return a=a+" failed: "+(d+" argument ")}
function y(a,b,c,d){if((!d||p(c))&&!ga(c))throw Error(Bb(a,b,d)+"must be a valid function.");}function Cb(a,b,c){if(p(c)&&(!ha(c)||null===c))throw Error(Bb(a,b,!0)+"must be a valid context object.");};var Db=n.Promise||eb;eb.prototype["catch"]=eb.prototype.yg;function Eb(){var a=this;this.reject=this.resolve=null;this.ra=new Db(function(b,c){a.resolve=b;a.reject=c})}function Fb(a,b){return function(c,d){c?a.reject(c):a.resolve(d);ga(b)&&(Gb(a.ra),1===b.length?b(c):b(c,d))}}function Gb(a){a.then(void 0,aa)};function Hb(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function A(a,b){if(Object.prototype.hasOwnProperty.call(a,b))return a[b]}function Ib(a,b){for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&b(c,a[c])};function Jb(a){var b=[];Ib(a,function(a,d){da(d)?Ga(d,function(d){b.push(encodeURIComponent(a)+"="+encodeURIComponent(d))}):b.push(encodeURIComponent(a)+"="+encodeURIComponent(d))});return b.length?"&"+b.join("&"):""};function Kb(a){return"undefined"!==typeof JSON&&p(JSON.parse)?JSON.parse(a):wa(a)}function B(a){if("undefined"!==typeof JSON&&p(JSON.stringify))a=JSON.stringify(a);else{var b=[];ya(new xa,a,b);a=b.join("")}return a};function Lb(a,b){if(!a)throw Mb(b);}function Mb(a){return Error("Firebase Database ("+firebase.SDK_VERSION+") INTERNAL ASSERT FAILED: "+a)};function Nb(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);55296<=e&&56319>=e&&(e-=55296,d++,Lb(d<a.length,"Surrogate pair missing trail surrogate."),e=65536+(e<<10)+(a.charCodeAt(d)-56320));128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(65536>e?b[c++]=e>>12|224:(b[c++]=e>>18|240,b[c++]=e>>12&63|128),b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b}function Ob(a){for(var b=0,c=0;c<a.length;c++){var d=a.charCodeAt(c);128>d?b++:2048>d?b+=2:55296<=d&&56319>=d?(b+=4,c++):b+=3}return b};function Pb(){return"undefined"!==typeof window&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test("undefined"!==typeof navigator&&"string"===typeof navigator.userAgent?navigator.userAgent:"")};function Qb(a){this.te=a;this.Bd=[];this.Rb=0;this.Yd=-1;this.Gb=null}function Rb(a,b,c){a.Yd=b;a.Gb=c;a.Yd<a.Rb&&(a.Gb(),a.Gb=null)}function Sb(a,b,c){for(a.Bd[b]=c;a.Bd[a.Rb];){var d=a.Bd[a.Rb];delete a.Bd[a.Rb];for(var e=0;e<d.length;++e)if(d[e]){var f=a;Tb(function(){f.te(d[e])})}if(a.Rb===a.Yd){a.Gb&&(clearTimeout(a.Gb),a.Gb(),a.Gb=null);break}a.Rb++}};function Ub(){this.qc={}}Ub.prototype.set=function(a,b){null==b?delete this.qc[a]:this.qc[a]=b};Ub.prototype.get=function(a){return Hb(this.qc,a)?this.qc[a]:null};Ub.prototype.remove=function(a){delete this.qc[a]};Ub.prototype.bf=!0;function Vb(a){this.vc=a;this.Cd="firebase:"}g=Vb.prototype;g.set=function(a,b){null==b?this.vc.removeItem(this.Cd+a):this.vc.setItem(this.Cd+a,B(b))};g.get=function(a){a=this.vc.getItem(this.Cd+a);return null==a?null:Kb(a)};g.remove=function(a){this.vc.removeItem(this.Cd+a)};g.bf=!1;g.toString=function(){return this.vc.toString()};function Wb(a){try{if("undefined"!==typeof window&&"undefined"!==typeof window[a]){var b=window[a];b.setItem("firebase:sentinel","cache");b.removeItem("firebase:sentinel");return new Vb(b)}}catch(c){}return new Ub}var Xb=Wb("localStorage"),Yb=Wb("sessionStorage");function Zb(a,b){this.type=$b;this.source=a;this.path=b}Zb.prototype.Nc=function(){return this.path.e()?new Zb(this.source,C):new Zb(this.source,D(this.path))};Zb.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" listen_complete)"};function ac(a,b,c){this.type=bc;this.source=a;this.path=b;this.Ja=c}ac.prototype.Nc=function(a){return this.path.e()?new ac(this.source,C,this.Ja.R(a)):new ac(this.source,D(this.path),this.Ja)};ac.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" overwrite: "+this.Ja.toString()+")"};function cc(a,b,c,d,e){this.host=a.toLowerCase();this.domain=this.host.substr(this.host.indexOf(".")+1);this.Sc=b;this.pe=c;this.Ag=d;this.mf=e||"";this.bb=Xb.get("host:"+a)||this.host}function dc(a,b){b!==a.bb&&(a.bb=b,"s-"===a.bb.substr(0,2)&&Xb.set("host:"+a.host,a.bb))}
function ec(a,b,c){E("string"===typeof b,"typeof type must == string");E("object"===typeof c,"typeof params must == object");if("websocket"===b)b=(a.Sc?"wss://":"ws://")+a.bb+"/.ws?";else if("long_polling"===b)b=(a.Sc?"https://":"http://")+a.bb+"/.lp?";else throw Error("Unknown connection type: "+b);a.host!==a.bb&&(c.ns=a.pe);var d=[];t(c,function(a,b){d.push(b+"="+a)});return b+d.join("&")}
cc.prototype.toString=function(){var a=(this.Sc?"https://":"http://")+this.host;this.mf&&(a+="<"+this.mf+">");return a};function fc(){this.Jd=F}fc.prototype.j=function(a){return this.Jd.Q(a)};fc.prototype.toString=function(){return this.Jd.toString()};function H(a,b,c,d){this.type=a;this.Ma=b;this.Za=c;this.qe=d;this.Dd=void 0}function gc(a){return new H(hc,a)}var hc="value";function ic(a,b,c,d){this.ae=b;this.Md=c;this.Dd=d;this.gd=a}ic.prototype.Zb=function(){var a=this.Md.xb();return"value"===this.gd?a.path:a.getParent().path};ic.prototype.ge=function(){return this.gd};ic.prototype.Ub=function(){return this.ae.Ub(this)};ic.prototype.toString=function(){return this.Zb().toString()+":"+this.gd+":"+B(this.Md.Te())};function jc(a,b,c){this.ae=a;this.error=b;this.path=c}jc.prototype.Zb=function(){return this.path};jc.prototype.ge=function(){return"cancel"};
jc.prototype.Ub=function(){return this.ae.Ub(this)};jc.prototype.toString=function(){return this.path.toString()+":cancel"};function kc(){}kc.prototype.We=function(){return null};kc.prototype.fe=function(){return null};var lc=new kc;function mc(a,b,c){this.Ff=a;this.Na=b;this.yd=c}mc.prototype.We=function(a){var b=this.Na.O;if(nc(b,a))return b.j().R(a);b=null!=this.yd?new oc(this.yd,!0,!1):this.Na.u();return this.Ff.rc(a,b)};mc.prototype.fe=function(a,b,c){var d=null!=this.yd?this.yd:pc(this.Na);a=this.Ff.Xd(d,b,1,c,a);return 0===a.length?null:a[0]};function qc(){this.wb=[]}function rc(a,b){for(var c=null,d=0;d<b.length;d++){var e=b[d],f=e.Zb();null===c||f.ca(c.Zb())||(a.wb.push(c),c=null);null===c&&(c=new sc(f));c.add(e)}c&&a.wb.push(c)}function tc(a,b,c){rc(a,c);uc(a,function(a){return a.ca(b)})}function vc(a,b,c){rc(a,c);uc(a,function(a){return a.contains(b)||b.contains(a)})}
function uc(a,b){for(var c=!0,d=0;d<a.wb.length;d++){var e=a.wb[d];if(e)if(e=e.Zb(),b(e)){for(var e=a.wb[d],f=0;f<e.hd.length;f++){var h=e.hd[f];if(null!==h){e.hd[f]=null;var k=h.Ub();wc&&I("event: "+h.toString());Tb(k)}}a.wb[d]=null}else c=!1}c&&(a.wb=[])}function sc(a){this.qa=a;this.hd=[]}sc.prototype.add=function(a){this.hd.push(a)};sc.prototype.Zb=function(){return this.qa};function oc(a,b,c){this.A=a;this.ea=b;this.Tb=c}function xc(a){return a.ea}function yc(a){return a.Tb}function zc(a,b){return b.e()?a.ea&&!a.Tb:nc(a,J(b))}function nc(a,b){return a.ea&&!a.Tb||a.A.Fa(b)}oc.prototype.j=function(){return this.A};function Ac(a,b){this.Oa=a;this.ba=b?b:Bc}g=Ac.prototype;g.Ra=function(a,b){return new Ac(this.Oa,this.ba.Ra(a,b,this.Oa).Y(null,null,!1,null,null))};g.remove=function(a){return new Ac(this.Oa,this.ba.remove(a,this.Oa).Y(null,null,!1,null,null))};g.get=function(a){for(var b,c=this.ba;!c.e();){b=this.Oa(a,c.key);if(0===b)return c.value;0>b?c=c.left:0<b&&(c=c.right)}return null};
function Cc(a,b){for(var c,d=a.ba,e=null;!d.e();){c=a.Oa(b,d.key);if(0===c){if(d.left.e())return e?e.key:null;for(d=d.left;!d.right.e();)d=d.right;return d.key}0>c?d=d.left:0<c&&(e=d,d=d.right)}throw Error("Attempted to find predecessor key for a nonexistent key.  What gives?");}g.e=function(){return this.ba.e()};g.count=function(){return this.ba.count()};g.Hc=function(){return this.ba.Hc()};g.fc=function(){return this.ba.fc()};g.ia=function(a){return this.ba.ia(a)};
g.Xb=function(a){return new Dc(this.ba,null,this.Oa,!1,a)};g.Yb=function(a,b){return new Dc(this.ba,a,this.Oa,!1,b)};g.$b=function(a,b){return new Dc(this.ba,a,this.Oa,!0,b)};g.Ze=function(a){return new Dc(this.ba,null,this.Oa,!0,a)};function Dc(a,b,c,d,e){this.Hd=e||null;this.le=d;this.Sa=[];for(e=1;!a.e();)if(e=b?c(a.key,b):1,d&&(e*=-1),0>e)a=this.le?a.left:a.right;else if(0===e){this.Sa.push(a);break}else this.Sa.push(a),a=this.le?a.right:a.left}
function K(a){if(0===a.Sa.length)return null;var b=a.Sa.pop(),c;c=a.Hd?a.Hd(b.key,b.value):{key:b.key,value:b.value};if(a.le)for(b=b.left;!b.e();)a.Sa.push(b),b=b.right;else for(b=b.right;!b.e();)a.Sa.push(b),b=b.left;return c}function Ec(a){if(0===a.Sa.length)return null;var b;b=a.Sa;b=b[b.length-1];return a.Hd?a.Hd(b.key,b.value):{key:b.key,value:b.value}}function Fc(a,b,c,d,e){this.key=a;this.value=b;this.color=null!=c?c:!0;this.left=null!=d?d:Bc;this.right=null!=e?e:Bc}g=Fc.prototype;
g.Y=function(a,b,c,d,e){return new Fc(null!=a?a:this.key,null!=b?b:this.value,null!=c?c:this.color,null!=d?d:this.left,null!=e?e:this.right)};g.count=function(){return this.left.count()+1+this.right.count()};g.e=function(){return!1};g.ia=function(a){return this.left.ia(a)||a(this.key,this.value)||this.right.ia(a)};function Gc(a){return a.left.e()?a:Gc(a.left)}g.Hc=function(){return Gc(this).key};g.fc=function(){return this.right.e()?this.key:this.right.fc()};
g.Ra=function(a,b,c){var d,e;e=this;d=c(a,e.key);e=0>d?e.Y(null,null,null,e.left.Ra(a,b,c),null):0===d?e.Y(null,b,null,null,null):e.Y(null,null,null,null,e.right.Ra(a,b,c));return Hc(e)};function Ic(a){if(a.left.e())return Bc;a.left.fa()||a.left.left.fa()||(a=Jc(a));a=a.Y(null,null,null,Ic(a.left),null);return Hc(a)}
g.remove=function(a,b){var c,d;c=this;if(0>b(a,c.key))c.left.e()||c.left.fa()||c.left.left.fa()||(c=Jc(c)),c=c.Y(null,null,null,c.left.remove(a,b),null);else{c.left.fa()&&(c=Kc(c));c.right.e()||c.right.fa()||c.right.left.fa()||(c=Lc(c),c.left.left.fa()&&(c=Kc(c),c=Lc(c)));if(0===b(a,c.key)){if(c.right.e())return Bc;d=Gc(c.right);c=c.Y(d.key,d.value,null,null,Ic(c.right))}c=c.Y(null,null,null,null,c.right.remove(a,b))}return Hc(c)};g.fa=function(){return this.color};
function Hc(a){a.right.fa()&&!a.left.fa()&&(a=Mc(a));a.left.fa()&&a.left.left.fa()&&(a=Kc(a));a.left.fa()&&a.right.fa()&&(a=Lc(a));return a}function Jc(a){a=Lc(a);a.right.left.fa()&&(a=a.Y(null,null,null,null,Kc(a.right)),a=Mc(a),a=Lc(a));return a}function Mc(a){return a.right.Y(null,null,a.color,a.Y(null,null,!0,null,a.right.left),null)}function Kc(a){return a.left.Y(null,null,a.color,null,a.Y(null,null,!0,a.left.right,null))}
function Lc(a){return a.Y(null,null,!a.color,a.left.Y(null,null,!a.left.color,null,null),a.right.Y(null,null,!a.right.color,null,null))}function Nc(){}g=Nc.prototype;g.Y=function(){return this};g.Ra=function(a,b){return new Fc(a,b,null)};g.remove=function(){return this};g.count=function(){return 0};g.e=function(){return!0};g.ia=function(){return!1};g.Hc=function(){return null};g.fc=function(){return null};g.fa=function(){return!1};var Bc=new Nc;var Oc=function(){var a=1;return function(){return a++}}(),E=Lb,Pc=Mb;
function Qc(a){try{var b;if("undefined"!==typeof atob)b=atob(a);else{xb();for(var c=vb,d=[],e=0;e<a.length;){var f=c[a.charAt(e++)],h=e<a.length?c[a.charAt(e)]:0;++e;var k=e<a.length?c[a.charAt(e)]:64;++e;var m=e<a.length?c[a.charAt(e)]:64;++e;if(null==f||null==h||null==k||null==m)throw Error();d.push(f<<2|h>>4);64!=k&&(d.push(h<<4&240|k>>2),64!=m&&d.push(k<<6&192|m))}if(8192>d.length)b=String.fromCharCode.apply(null,d);else{a="";for(c=0;c<d.length;c+=8192)a+=String.fromCharCode.apply(null,Oa(d,c,
c+8192));b=a}}return b}catch(l){I("base64Decode failed: ",l)}return null}function Rc(a){var b=Nb(a);a=new zb;a.update(b);var b=[],c=8*a.Pd;56>a.ac?a.update(a.zd,56-a.ac):a.update(a.zd,a.Ya-(a.ac-56));for(var d=a.Ya-1;56<=d;d--)a.Wd[d]=c&255,c/=256;Ab(a,a.Wd);for(d=c=0;5>d;d++)for(var e=24;0<=e;e-=8)b[c]=a.N[d]>>e&255,++c;return wb(b)}
function Sc(a){for(var b="",c=0;c<arguments.length;c++)b=ea(arguments[c])?b+Sc.apply(null,arguments[c]):"object"===typeof arguments[c]?b+B(arguments[c]):b+arguments[c],b+=" ";return b}var wc=null,Tc=!0;
function Uc(a,b){Lb(!b||!0===a||!1===a,"Can't turn on custom loggers persistently.");!0===a?("undefined"!==typeof console&&("function"===typeof console.log?wc=r(console.log,console):"object"===typeof console.log&&(wc=function(a){console.log(a)})),b&&Yb.set("logging_enabled",!0)):ga(a)?wc=a:(wc=null,Yb.remove("logging_enabled"))}function I(a){!0===Tc&&(Tc=!1,null===wc&&!0===Yb.get("logging_enabled")&&Uc(!0));if(wc){var b=Sc.apply(null,arguments);wc(b)}}
function Vc(a){return function(){I(a,arguments)}}function Wc(a){if("undefined"!==typeof console){var b="FIREBASE INTERNAL ERROR: "+Sc.apply(null,arguments);"undefined"!==typeof console.error?console.error(b):console.log(b)}}function Xc(a){var b=Sc.apply(null,arguments);throw Error("FIREBASE FATAL ERROR: "+b);}function L(a){if("undefined"!==typeof console){var b="FIREBASE WARNING: "+Sc.apply(null,arguments);"undefined"!==typeof console.warn?console.warn(b):console.log(b)}}
function Yc(a){var b,c,d,e,f,h=a;f=c=a=b="";d=!0;e="https";if(q(h)){var k=h.indexOf("//");0<=k&&(e=h.substring(0,k-1),h=h.substring(k+2));k=h.indexOf("/");-1===k&&(k=h.length);b=h.substring(0,k);f="";h=h.substring(k).split("/");for(k=0;k<h.length;k++)if(0<h[k].length){var m=h[k];try{m=decodeURIComponent(m.replace(/\+/g," "))}catch(l){}f+="/"+m}h=b.split(".");3===h.length?(a=h[1],c=h[0].toLowerCase()):2===h.length&&(a=h[0]);k=b.indexOf(":");0<=k&&(d="https"===e||"wss"===e)}"firebase"===a&&Xc(b+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead");
c&&"undefined"!=c||Xc("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com");d||"undefined"!==typeof window&&window.location&&window.location.protocol&&-1!==window.location.protocol.indexOf("https:")&&L("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");return{kc:new cc(b,d,c,"ws"===e||"wss"===e),path:new M(f)}}function Zc(a){return fa(a)&&(a!=a||a==Number.POSITIVE_INFINITY||a==Number.NEGATIVE_INFINITY)}
function $c(a){if("complete"===document.readyState)a();else{var b=!1,c=function(){document.body?b||(b=!0,a()):setTimeout(c,Math.floor(10))};document.addEventListener?(document.addEventListener("DOMContentLoaded",c,!1),window.addEventListener("load",c,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",function(){"complete"===document.readyState&&c()}),window.attachEvent("onload",c))}}
function ad(a,b){if(a===b)return 0;if("[MIN_NAME]"===a||"[MAX_NAME]"===b)return-1;if("[MIN_NAME]"===b||"[MAX_NAME]"===a)return 1;var c=bd(a),d=bd(b);return null!==c?null!==d?0==c-d?a.length-b.length:c-d:-1:null!==d?1:a<b?-1:1}function cd(a,b){if(b&&a in b)return b[a];throw Error("Missing required key ("+a+") in object: "+B(b));}
function dd(a){if("object"!==typeof a||null===a)return B(a);var b=[],c;for(c in a)b.push(c);b.sort();c="{";for(var d=0;d<b.length;d++)0!==d&&(c+=","),c+=B(b[d]),c+=":",c+=dd(a[b[d]]);return c+"}"}function ed(a,b){if(a.length<=b)return[a];for(var c=[],d=0;d<a.length;d+=b)d+b>a?c.push(a.substring(d,a.length)):c.push(a.substring(d,d+b));return c}function fd(a,b){if(da(a))for(var c=0;c<a.length;++c)b(c,a[c]);else t(a,b)}
function gd(a){E(!Zc(a),"Invalid JSON number");var b,c,d,e;0===a?(d=c=0,b=-Infinity===1/a?1:0):(b=0>a,a=Math.abs(a),a>=Math.pow(2,-1022)?(d=Math.min(Math.floor(Math.log(a)/Math.LN2),1023),c=d+1023,d=Math.round(a*Math.pow(2,52-d)-Math.pow(2,52))):(c=0,d=Math.round(a/Math.pow(2,-1074))));e=[];for(a=52;a;--a)e.push(d%2?1:0),d=Math.floor(d/2);for(a=11;a;--a)e.push(c%2?1:0),c=Math.floor(c/2);e.push(b?1:0);e.reverse();b=e.join("");c="";for(a=0;64>a;a+=8)d=parseInt(b.substr(a,8),2).toString(16),1===d.length&&
(d="0"+d),c+=d;return c.toLowerCase()}var hd=/^-?\d{1,10}$/;function bd(a){return hd.test(a)&&(a=Number(a),-2147483648<=a&&2147483647>=a)?a:null}function Tb(a){try{a()}catch(b){setTimeout(function(){L("Exception was thrown by user callback.",b.stack||"");throw b;},Math.floor(0))}}function id(a,b,c){Object.defineProperty(a,b,{get:c})};function jd(a){var b={};try{var c=a.split(".");Kb(Qc(c[0])||"");b=Kb(Qc(c[1])||"");delete b.d}catch(d){}a=b;return"object"===typeof a&&!0===A(a,"admin")};function kd(a,b,c){this.type=ld;this.source=a;this.path=b;this.children=c}kd.prototype.Nc=function(a){if(this.path.e())return a=this.children.subtree(new M(a)),a.e()?null:a.value?new ac(this.source,C,a.value):new kd(this.source,C,a);E(J(this.path)===a,"Can't get a merge for a child not on the path of the operation");return new kd(this.source,D(this.path),this.children)};kd.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"};function md(a){this.g=a}g=md.prototype;g.F=function(a,b,c,d,e,f){E(a.zc(this.g),"A node must be indexed if only a child is updated");e=a.R(b);if(e.Q(d).ca(c.Q(d))&&e.e()==c.e())return a;null!=f&&(c.e()?a.Fa(b)?nd(f,new H("child_removed",e,b)):E(a.J(),"A child remove without an old child only makes sense on a leaf node"):e.e()?nd(f,new H("child_added",c,b)):nd(f,new H("child_changed",c,b,e)));return a.J()&&c.e()?a:a.U(b,c).ob(this.g)};
g.za=function(a,b,c){null!=c&&(a.J()||a.P(N,function(a,e){b.Fa(a)||nd(c,new H("child_removed",e,a))}),b.J()||b.P(N,function(b,e){if(a.Fa(b)){var f=a.R(b);f.ca(e)||nd(c,new H("child_changed",e,b,f))}else nd(c,new H("child_added",e,b))}));return b.ob(this.g)};g.ga=function(a,b){return a.e()?F:a.ga(b)};g.Qa=function(){return!1};g.Vb=function(){return this};function od(a){this.he=new md(a.g);this.g=a.g;var b;a.ka?(b=pd(a),b=a.g.Fc(qd(a),b)):b=a.g.Ic();this.Uc=b;a.na?(b=rd(a),a=a.g.Fc(sd(a),b)):a=a.g.Gc();this.wc=a}g=od.prototype;g.matches=function(a){return 0>=this.g.compare(this.Uc,a)&&0>=this.g.compare(a,this.wc)};g.F=function(a,b,c,d,e,f){this.matches(new O(b,c))||(c=F);return this.he.F(a,b,c,d,e,f)};
g.za=function(a,b,c){b.J()&&(b=F);var d=b.ob(this.g),d=d.ga(F),e=this;b.P(N,function(a,b){e.matches(new O(a,b))||(d=d.U(a,F))});return this.he.za(a,d,c)};g.ga=function(a){return a};g.Qa=function(){return!0};g.Vb=function(){return this.he};function td(){this.hb={}}
function nd(a,b){var c=b.type,d=b.Za;E("child_added"==c||"child_changed"==c||"child_removed"==c,"Only child changes supported for tracking");E(".priority"!==d,"Only non-priority child changes can be tracked.");var e=A(a.hb,d);if(e){var f=e.type;if("child_added"==c&&"child_removed"==f)a.hb[d]=new H("child_changed",b.Ma,d,e.Ma);else if("child_removed"==c&&"child_added"==f)delete a.hb[d];else if("child_removed"==c&&"child_changed"==f)a.hb[d]=new H("child_removed",e.qe,d);else if("child_changed"==c&&
"child_added"==f)a.hb[d]=new H("child_added",b.Ma,d);else if("child_changed"==c&&"child_changed"==f)a.hb[d]=new H("child_changed",b.Ma,d,e.qe);else throw Pc("Illegal combination of changes: "+b+" occurred after "+e);}else a.hb[d]=b};function ud(a,b){this.Sd=a;this.Lf=b}function vd(a){this.V=a}
vd.prototype.gb=function(a,b,c,d){var e=new td,f;if(b.type===bc)b.source.ee?c=wd(this,a,b.path,b.Ja,c,d,e):(E(b.source.Ve,"Unknown source."),f=b.source.Ee||yc(a.u())&&!b.path.e(),c=xd(this,a,b.path,b.Ja,c,d,f,e));else if(b.type===ld)b.source.ee?c=yd(this,a,b.path,b.children,c,d,e):(E(b.source.Ve,"Unknown source."),f=b.source.Ee||yc(a.u()),c=zd(this,a,b.path,b.children,c,d,f,e));else if(b.type===Ad)if(b.Id)if(b=b.path,null!=c.mc(b))c=a;else{f=new mc(c,a,d);d=a.O.j();if(b.e()||".priority"===J(b))xc(a.u())?
b=c.Ba(pc(a)):(b=a.u().j(),E(b instanceof P,"serverChildren would be complete if leaf node"),b=c.sc(b)),b=this.V.za(d,b,e);else{var h=J(b),k=c.rc(h,a.u());null==k&&nc(a.u(),h)&&(k=d.R(h));b=null!=k?this.V.F(d,h,k,D(b),f,e):a.O.j().Fa(h)?this.V.F(d,h,F,D(b),f,e):d;b.e()&&xc(a.u())&&(d=c.Ba(pc(a)),d.J()&&(b=this.V.za(b,d,e)))}d=xc(a.u())||null!=c.mc(C);c=Cd(a,b,d,this.V.Qa())}else c=Dd(this,a,b.path,b.Pb,c,d,e);else if(b.type===$b)d=b.path,b=a.u(),f=b.j(),h=b.ea||d.e(),c=Ed(this,new Fd(a.O,new oc(f,
h,b.Tb)),d,c,lc,e);else throw Pc("Unknown operation type: "+b.type);e=pa(e.hb);d=c;b=d.O;b.ea&&(f=b.j().J()||b.j().e(),h=Gd(a),(0<e.length||!a.O.ea||f&&!b.j().ca(h)||!b.j().C().ca(h.C()))&&e.push(gc(Gd(d))));return new ud(c,e)};
function Ed(a,b,c,d,e,f){var h=b.O;if(null!=d.mc(c))return b;var k;if(c.e())E(xc(b.u()),"If change path is empty, we must have complete server data"),yc(b.u())?(e=pc(b),d=d.sc(e instanceof P?e:F)):d=d.Ba(pc(b)),f=a.V.za(b.O.j(),d,f);else{var m=J(c);if(".priority"==m)E(1==Hd(c),"Can't have a priority with additional path components"),f=h.j(),k=b.u().j(),d=d.$c(c,f,k),f=null!=d?a.V.ga(f,d):h.j();else{var l=D(c);nc(h,m)?(k=b.u().j(),d=d.$c(c,h.j(),k),d=null!=d?h.j().R(m).F(l,d):h.j().R(m)):d=d.rc(m,
b.u());f=null!=d?a.V.F(h.j(),m,d,l,e,f):h.j()}}return Cd(b,f,h.ea||c.e(),a.V.Qa())}function xd(a,b,c,d,e,f,h,k){var m=b.u();h=h?a.V:a.V.Vb();if(c.e())d=h.za(m.j(),d,null);else if(h.Qa()&&!m.Tb)d=m.j().F(c,d),d=h.za(m.j(),d,null);else{var l=J(c);if(!zc(m,c)&&1<Hd(c))return b;var u=D(c);d=m.j().R(l).F(u,d);d=".priority"==l?h.ga(m.j(),d):h.F(m.j(),l,d,u,lc,null)}m=m.ea||c.e();b=new Fd(b.O,new oc(d,m,h.Qa()));return Ed(a,b,c,e,new mc(e,b,f),k)}
function wd(a,b,c,d,e,f,h){var k=b.O;e=new mc(e,b,f);if(c.e())h=a.V.za(b.O.j(),d,h),a=Cd(b,h,!0,a.V.Qa());else if(f=J(c),".priority"===f)h=a.V.ga(b.O.j(),d),a=Cd(b,h,k.ea,k.Tb);else{c=D(c);var m=k.j().R(f);if(!c.e()){var l=e.We(f);d=null!=l?".priority"===Id(c)&&l.Q(c.parent()).e()?l:l.F(c,d):F}m.ca(d)?a=b:(h=a.V.F(k.j(),f,d,c,e,h),a=Cd(b,h,k.ea,a.V.Qa()))}return a}
function yd(a,b,c,d,e,f,h){var k=b;Jd(d,function(d,l){var u=c.m(d);nc(b.O,J(u))&&(k=wd(a,k,u,l,e,f,h))});Jd(d,function(d,l){var u=c.m(d);nc(b.O,J(u))||(k=wd(a,k,u,l,e,f,h))});return k}function Kd(a,b){Jd(b,function(b,d){a=a.F(b,d)});return a}
function zd(a,b,c,d,e,f,h,k){if(b.u().j().e()&&!xc(b.u()))return b;var m=b;c=c.e()?d:Ld(Q,c,d);var l=b.u().j();c.children.ia(function(c,d){if(l.Fa(c)){var G=b.u().j().R(c),G=Kd(G,d);m=xd(a,m,new M(c),G,e,f,h,k)}});c.children.ia(function(c,d){var G=!nc(b.u(),c)&&null==d.value;l.Fa(c)||G||(G=b.u().j().R(c),G=Kd(G,d),m=xd(a,m,new M(c),G,e,f,h,k))});return m}
function Dd(a,b,c,d,e,f,h){if(null!=e.mc(c))return b;var k=yc(b.u()),m=b.u();if(null!=d.value){if(c.e()&&m.ea||zc(m,c))return xd(a,b,c,m.j().Q(c),e,f,k,h);if(c.e()){var l=Q;m.j().P(Md,function(a,b){l=l.set(new M(a),b)});return zd(a,b,c,l,e,f,k,h)}return b}l=Q;Jd(d,function(a){var b=c.m(a);zc(m,b)&&(l=l.set(a,m.j().Q(b)))});return zd(a,b,c,l,e,f,k,h)};var Nd=function(){var a=0,b=[];return function(c){var d=c===a;a=c;for(var e=Array(8),f=7;0<=f;f--)e[f]="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c%64),c=Math.floor(c/64);E(0===c,"Cannot push at time == 0");c=e.join("");if(d){for(f=11;0<=f&&63===b[f];f--)b[f]=0;b[f]++}else for(f=0;12>f;f++)b[f]=Math.floor(64*Math.random());for(f=0;12>f;f++)c+="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);E(20===c.length,"nextPushId: Length should be 20.");
return c}}();function M(a,b){if(1==arguments.length){this.o=a.split("/");for(var c=0,d=0;d<this.o.length;d++)0<this.o[d].length&&(this.o[c]=this.o[d],c++);this.o.length=c;this.Z=0}else this.o=a,this.Z=b}function R(a,b){var c=J(a);if(null===c)return b;if(c===J(b))return R(D(a),D(b));throw Error("INTERNAL ERROR: innerPath ("+b+") is not within outerPath ("+a+")");}
function Od(a,b){for(var c=a.slice(),d=b.slice(),e=0;e<c.length&&e<d.length;e++){var f=ad(c[e],d[e]);if(0!==f)return f}return c.length===d.length?0:c.length<d.length?-1:1}function J(a){return a.Z>=a.o.length?null:a.o[a.Z]}function Hd(a){return a.o.length-a.Z}function D(a){var b=a.Z;b<a.o.length&&b++;return new M(a.o,b)}function Id(a){return a.Z<a.o.length?a.o[a.o.length-1]:null}g=M.prototype;
g.toString=function(){for(var a="",b=this.Z;b<this.o.length;b++)""!==this.o[b]&&(a+="/"+this.o[b]);return a||"/"};g.slice=function(a){return this.o.slice(this.Z+(a||0))};g.parent=function(){if(this.Z>=this.o.length)return null;for(var a=[],b=this.Z;b<this.o.length-1;b++)a.push(this.o[b]);return new M(a,0)};
g.m=function(a){for(var b=[],c=this.Z;c<this.o.length;c++)b.push(this.o[c]);if(a instanceof M)for(c=a.Z;c<a.o.length;c++)b.push(a.o[c]);else for(a=a.split("/"),c=0;c<a.length;c++)0<a[c].length&&b.push(a[c]);return new M(b,0)};g.e=function(){return this.Z>=this.o.length};g.ca=function(a){if(Hd(this)!==Hd(a))return!1;for(var b=this.Z,c=a.Z;b<=this.o.length;b++,c++)if(this.o[b]!==a.o[c])return!1;return!0};
g.contains=function(a){var b=this.Z,c=a.Z;if(Hd(this)>Hd(a))return!1;for(;b<this.o.length;){if(this.o[b]!==a.o[c])return!1;++b;++c}return!0};var C=new M("");function Pd(a,b){this.Ta=a.slice();this.Ka=Math.max(1,this.Ta.length);this.Se=b;for(var c=0;c<this.Ta.length;c++)this.Ka+=Ob(this.Ta[c]);Qd(this)}Pd.prototype.push=function(a){0<this.Ta.length&&(this.Ka+=1);this.Ta.push(a);this.Ka+=Ob(a);Qd(this)};Pd.prototype.pop=function(){var a=this.Ta.pop();this.Ka-=Ob(a);0<this.Ta.length&&--this.Ka};
function Qd(a){if(768<a.Ka)throw Error(a.Se+"has a key path longer than 768 bytes ("+a.Ka+").");if(32<a.Ta.length)throw Error(a.Se+"path specified exceeds the maximum depth that can be written (32) or object contains a cycle "+Rd(a));}function Rd(a){return 0==a.Ta.length?"":"in property '"+a.Ta.join(".")+"'"};var Sd=/[\[\].#$\/\u0000-\u001F\u007F]/,Td=/[\[\].#$\u0000-\u001F\u007F]/;function Ud(a){return q(a)&&0!==a.length&&!Sd.test(a)}function Vd(a){return null===a||q(a)||fa(a)&&!Zc(a)||ha(a)&&Hb(a,".sv")}function Wd(a,b,c,d){d&&!p(b)||Xd(Bb(a,1,d),b,c)}
function Xd(a,b,c){c instanceof M&&(c=new Pd(c,a));if(!p(b))throw Error(a+"contains undefined "+Rd(c));if(ga(b))throw Error(a+"contains a function "+Rd(c)+" with contents: "+b.toString());if(Zc(b))throw Error(a+"contains "+b.toString()+" "+Rd(c));if(q(b)&&b.length>10485760/3&&10485760<Ob(b))throw Error(a+"contains a string greater than 10485760 utf8 bytes "+Rd(c)+" ('"+b.substring(0,50)+"...')");if(ha(b)){var d=!1,e=!1;Ib(b,function(b,h){if(".value"===b)d=!0;else if(".priority"!==b&&".sv"!==b&&(e=
!0,!Ud(b)))throw Error(a+" contains an invalid key ("+b+") "+Rd(c)+'.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');c.push(b);Xd(a,h,c);c.pop()});if(d&&e)throw Error(a+' contains ".value" child '+Rd(c)+" in addition to actual children.");}}
function Yd(a,b){var c,d;for(c=0;c<b.length;c++){d=b[c];for(var e=d.slice(),f=0;f<e.length;f++)if((".priority"!==e[f]||f!==e.length-1)&&!Ud(e[f]))throw Error(a+"contains an invalid key ("+e[f]+") in path "+d.toString()+'. Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');}b.sort(Od);e=null;for(c=0;c<b.length;c++){d=b[c];if(null!==e&&e.contains(d))throw Error(a+"contains a path "+e.toString()+" that is ancestor of another path "+d.toString());e=d}}
function Zd(a,b,c){var d=Bb(a,1,!1);if(!ha(b)||da(b))throw Error(d+" must be an object containing the children to replace.");var e=[];Ib(b,function(a,b){var k=new M(a);Xd(d,b,c.m(k));if(".priority"===Id(k)&&!Vd(b))throw Error(d+"contains an invalid value for '"+k.toString()+"', which must be a valid Firebase priority (a string, finite number, server value, or null).");e.push(k)});Yd(d,e)}
function $d(a,b,c){if(Zc(c))throw Error(Bb(a,b,!1)+"is "+c.toString()+", but must be a valid Firebase priority (a string, finite number, server value, or null).");if(!Vd(c))throw Error(Bb(a,b,!1)+"must be a valid Firebase priority (a string, finite number, server value, or null).");}
function ae(a,b,c){if(!c||p(b))switch(b){case "value":case "child_added":case "child_removed":case "child_changed":case "child_moved":break;default:throw Error(Bb(a,1,c)+'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');}}function be(a,b){if(p(b)&&!Ud(b))throw Error(Bb(a,2,!0)+'was an invalid key: "'+b+'".  Firebase keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]").');}
function ce(a,b){if(!q(b)||0===b.length||Td.test(b))throw Error(Bb(a,1,!1)+'was an invalid path: "'+b+'". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"');}function de(a,b){if(".info"===J(b))throw Error(a+" failed: Can't modify data under /.info/");}
function ee(a,b){var c=b.path.toString(),d;!(d=!q(b.kc.host)||0===b.kc.host.length||!Ud(b.kc.pe))&&(d=0!==c.length)&&(c&&(c=c.replace(/^\/*\.info(\/|$)/,"/")),d=!(q(c)&&0!==c.length&&!Td.test(c)));if(d)throw Error(Bb(a,1,!1)+'must be a valid firebase URL and the path can\'t contain ".", "#", "$", "[", or "]".');};function fe(){this.children={};this.ad=0;this.value=null}function ge(a,b,c){this.ud=a?a:"";this.Ha=b?b:null;this.A=c?c:new fe}function he(a,b){for(var c=b instanceof M?b:new M(b),d=a,e;null!==(e=J(c));)d=new ge(e,d,A(d.A.children,e)||new fe),c=D(c);return d}g=ge.prototype;g.Ea=function(){return this.A.value};function ie(a,b){E("undefined"!==typeof b,"Cannot set value to undefined");a.A.value=b;je(a)}g.clear=function(){this.A.value=null;this.A.children={};this.A.ad=0;je(this)};
g.kd=function(){return 0<this.A.ad};g.e=function(){return null===this.Ea()&&!this.kd()};g.P=function(a){var b=this;t(this.A.children,function(c,d){a(new ge(d,b,c))})};function ke(a,b,c,d){c&&!d&&b(a);a.P(function(a){ke(a,b,!0,d)});c&&d&&b(a)}function le(a,b){for(var c=a.parent();null!==c&&!b(c);)c=c.parent()}g.path=function(){return new M(null===this.Ha?this.ud:this.Ha.path()+"/"+this.ud)};g.name=function(){return this.ud};g.parent=function(){return this.Ha};
function je(a){if(null!==a.Ha){var b=a.Ha,c=a.ud,d=a.e(),e=Hb(b.A.children,c);d&&e?(delete b.A.children[c],b.A.ad--,je(b)):d||e||(b.A.children[c]=a.A,b.A.ad++,je(b))}};function me(a){E(da(a)&&0<a.length,"Requires a non-empty array");this.Jf=a;this.Ec={}}me.prototype.Ge=function(a,b){var c;c=this.Ec[a]||[];var d=c.length;if(0<d){for(var e=Array(d),f=0;f<d;f++)e[f]=c[f];c=e}else c=[];for(d=0;d<c.length;d++)c[d].Ke.apply(c[d].Pa,Array.prototype.slice.call(arguments,1))};me.prototype.hc=function(a,b,c){ne(this,a);this.Ec[a]=this.Ec[a]||[];this.Ec[a].push({Ke:b,Pa:c});(a=this.Xe(a))&&b.apply(c,a)};
me.prototype.Jc=function(a,b,c){ne(this,a);a=this.Ec[a]||[];for(var d=0;d<a.length;d++)if(a[d].Ke===b&&(!c||c===a[d].Pa)){a.splice(d,1);break}};function ne(a,b){E(La(a.Jf,function(a){return a===b}),"Unknown event: "+b)};function oe(a,b){this.value=a;this.children=b||pe}var pe=new Ac(function(a,b){return a===b?0:a<b?-1:1});function qe(a){var b=Q;t(a,function(a,d){b=b.set(new M(d),a)});return b}g=oe.prototype;g.e=function(){return null===this.value&&this.children.e()};function re(a,b,c){if(null!=a.value&&c(a.value))return{path:C,value:a.value};if(b.e())return null;var d=J(b);a=a.children.get(d);return null!==a?(b=re(a,D(b),c),null!=b?{path:(new M(d)).m(b.path),value:b.value}:null):null}
function se(a,b){return re(a,b,function(){return!0})}g.subtree=function(a){if(a.e())return this;var b=this.children.get(J(a));return null!==b?b.subtree(D(a)):Q};g.set=function(a,b){if(a.e())return new oe(b,this.children);var c=J(a),d=(this.children.get(c)||Q).set(D(a),b),c=this.children.Ra(c,d);return new oe(this.value,c)};
g.remove=function(a){if(a.e())return this.children.e()?Q:new oe(null,this.children);var b=J(a),c=this.children.get(b);return c?(a=c.remove(D(a)),b=a.e()?this.children.remove(b):this.children.Ra(b,a),null===this.value&&b.e()?Q:new oe(this.value,b)):this};g.get=function(a){if(a.e())return this.value;var b=this.children.get(J(a));return b?b.get(D(a)):null};
function Ld(a,b,c){if(b.e())return c;var d=J(b);b=Ld(a.children.get(d)||Q,D(b),c);d=b.e()?a.children.remove(d):a.children.Ra(d,b);return new oe(a.value,d)}function te(a,b){return ue(a,C,b)}function ue(a,b,c){var d={};a.children.ia(function(a,f){d[a]=ue(f,b.m(a),c)});return c(b,a.value,d)}function ve(a,b,c){return we(a,b,C,c)}function we(a,b,c,d){var e=a.value?d(c,a.value):!1;if(e)return e;if(b.e())return null;e=J(b);return(a=a.children.get(e))?we(a,D(b),c.m(e),d):null}
function xe(a,b,c){ye(a,b,C,c)}function ye(a,b,c,d){if(b.e())return a;a.value&&d(c,a.value);var e=J(b);return(a=a.children.get(e))?ye(a,D(b),c.m(e),d):Q}function Jd(a,b){ze(a,C,b)}function ze(a,b,c){a.children.ia(function(a,e){ze(e,b.m(a),c)});a.value&&c(b,a.value)}function Ae(a,b){a.children.ia(function(a,d){d.value&&b(a,d.value)})}var Q=new oe(null);oe.prototype.toString=function(){var a={};Jd(this,function(b,c){a[b.toString()]=c.toString()});return B(a)};function Be(a,b,c){this.type=Ad;this.source=Ce;this.path=a;this.Pb=b;this.Id=c}Be.prototype.Nc=function(a){if(this.path.e()){if(null!=this.Pb.value)return E(this.Pb.children.e(),"affectedTree should not have overlapping affected paths."),this;a=this.Pb.subtree(new M(a));return new Be(C,a,this.Id)}E(J(this.path)===a,"operationForChild called for unrelated child.");return new Be(D(this.path),this.Pb,this.Id)};
Be.prototype.toString=function(){return"Operation("+this.path+": "+this.source.toString()+" ack write revert="+this.Id+" affectedTree="+this.Pb+")"};var bc=0,ld=1,Ad=2,$b=3;function De(a,b,c,d){this.ee=a;this.Ve=b;this.Ib=c;this.Ee=d;E(!d||b,"Tagged queries must be from server.")}var Ce=new De(!0,!1,null,!1),Ee=new De(!1,!0,null,!1);De.prototype.toString=function(){return this.ee?"user":this.Ee?"server(queryID="+this.Ib+")":"server"};function Fe(){me.call(this,["visible"]);var a,b;"undefined"!==typeof document&&"undefined"!==typeof document.addEventListener&&("undefined"!==typeof document.hidden?(b="visibilitychange",a="hidden"):"undefined"!==typeof document.mozHidden?(b="mozvisibilitychange",a="mozHidden"):"undefined"!==typeof document.msHidden?(b="msvisibilitychange",a="msHidden"):"undefined"!==typeof document.webkitHidden&&(b="webkitvisibilitychange",a="webkitHidden"));this.Nb=!0;if(b){var c=this;document.addEventListener(b,
function(){var b=!document[a];b!==c.Nb&&(c.Nb=b,c.Ge("visible",b))},!1)}}ka(Fe,me);Fe.prototype.Xe=function(a){E("visible"===a,"Unknown event type: "+a);return[this.Nb]};ba(Fe);function Ge(){this.set={}}g=Ge.prototype;g.add=function(a,b){this.set[a]=null!==b?b:!0};g.contains=function(a){return Hb(this.set,a)};g.get=function(a){return this.contains(a)?this.set[a]:void 0};g.remove=function(a){delete this.set[a]};g.clear=function(){this.set={}};g.e=function(){return ua(this.set)};g.count=function(){return na(this.set)};function He(a,b){t(a.set,function(a,d){b(d,a)})}g.keys=function(){var a=[];t(this.set,function(b,c){a.push(c)});return a};function Ie(a,b){return a&&"object"===typeof a?(E(".sv"in a,"Unexpected leaf node or priority contents"),b[a[".sv"]]):a}function Je(a,b){var c=new Ke;Le(a,new M(""),function(a,e){Me(c,a,Ne(e,b))});return c}function Ne(a,b){var c=a.C().H(),c=Ie(c,b),d;if(a.J()){var e=Ie(a.Ea(),b);return e!==a.Ea()||c!==a.C().H()?new Oe(e,S(c)):a}d=a;c!==a.C().H()&&(d=d.ga(new Oe(c)));a.P(N,function(a,c){var e=Ne(c,b);e!==c&&(d=d.U(a,e))});return d};function Pe(){me.call(this,["online"]);this.ic=!0;if("undefined"!==typeof window&&"undefined"!==typeof window.addEventListener&&!Pb()){var a=this;window.addEventListener("online",function(){a.ic||(a.ic=!0,a.Ge("online",!0))},!1);window.addEventListener("offline",function(){a.ic&&(a.ic=!1,a.Ge("online",!1))},!1)}}ka(Pe,me);Pe.prototype.Xe=function(a){E("online"===a,"Unknown event type: "+a);return[this.ic]};ba(Pe);function Qe(){}var Re={};function Se(a){return r(a.compare,a)}Qe.prototype.nd=function(a,b){return 0!==this.compare(new O("[MIN_NAME]",a),new O("[MIN_NAME]",b))};Qe.prototype.Ic=function(){return Te};function Ue(a){E(!a.e()&&".priority"!==J(a),"Can't create PathIndex with empty path or .priority key");this.cc=a}ka(Ue,Qe);g=Ue.prototype;g.yc=function(a){return!a.Q(this.cc).e()};g.compare=function(a,b){var c=a.S.Q(this.cc),d=b.S.Q(this.cc),c=c.tc(d);return 0===c?ad(a.name,b.name):c};
g.Fc=function(a,b){var c=S(a),c=F.F(this.cc,c);return new O(b,c)};g.Gc=function(){var a=F.F(this.cc,Ve);return new O("[MAX_NAME]",a)};g.toString=function(){return this.cc.slice().join("/")};function We(){}ka(We,Qe);g=We.prototype;g.compare=function(a,b){var c=a.S.C(),d=b.S.C(),c=c.tc(d);return 0===c?ad(a.name,b.name):c};g.yc=function(a){return!a.C().e()};g.nd=function(a,b){return!a.C().ca(b.C())};g.Ic=function(){return Te};g.Gc=function(){return new O("[MAX_NAME]",new Oe("[PRIORITY-POST]",Ve))};
g.Fc=function(a,b){var c=S(a);return new O(b,new Oe("[PRIORITY-POST]",c))};g.toString=function(){return".priority"};var N=new We;function Xe(){}ka(Xe,Qe);g=Xe.prototype;g.compare=function(a,b){return ad(a.name,b.name)};g.yc=function(){throw Pc("KeyIndex.isDefinedOn not expected to be called.");};g.nd=function(){return!1};g.Ic=function(){return Te};g.Gc=function(){return new O("[MAX_NAME]",F)};g.Fc=function(a){E(q(a),"KeyIndex indexValue must always be a string.");return new O(a,F)};g.toString=function(){return".key"};
var Md=new Xe;function Ye(){}ka(Ye,Qe);g=Ye.prototype;g.compare=function(a,b){var c=a.S.tc(b.S);return 0===c?ad(a.name,b.name):c};g.yc=function(){return!0};g.nd=function(a,b){return!a.ca(b)};g.Ic=function(){return Te};g.Gc=function(){return Ze};g.Fc=function(a,b){var c=S(a);return new O(b,c)};g.toString=function(){return".value"};var $e=new Ye;function af(a,b){return ad(a.name,b.name)}function bf(a,b){return ad(a,b)};function cf(a,b){this.od=a;this.dc=b}cf.prototype.get=function(a){var b=A(this.od,a);if(!b)throw Error("No index defined for "+a);return b===Re?null:b};function df(a,b,c){var d=la(a.od,function(d,f){var h=A(a.dc,f);E(h,"Missing index implementation for "+f);if(d===Re){if(h.yc(b.S)){for(var k=[],m=c.Xb(ef),l=K(m);l;)l.name!=b.name&&k.push(l),l=K(m);k.push(b);return ff(k,Se(h))}return Re}h=c.get(b.name);k=d;h&&(k=k.remove(new O(b.name,h)));return k.Ra(b,b.S)});return new cf(d,a.dc)}
function gf(a,b,c){var d=la(a.od,function(a){if(a===Re)return a;var d=c.get(b.name);return d?a.remove(new O(b.name,d)):a});return new cf(d,a.dc)}var hf=new cf({".priority":Re},{".priority":N});function O(a,b){this.name=a;this.S=b}function ef(a,b){return new O(a,b)};function jf(a){this.sa=new od(a);this.g=a.g;E(a.xa,"Only valid if limit has been set");this.oa=a.oa;this.Jb=!kf(a)}g=jf.prototype;g.F=function(a,b,c,d,e,f){this.sa.matches(new O(b,c))||(c=F);return a.R(b).ca(c)?a:a.Fb()<this.oa?this.sa.Vb().F(a,b,c,d,e,f):lf(this,a,b,c,e,f)};
g.za=function(a,b,c){var d;if(b.J()||b.e())d=F.ob(this.g);else if(2*this.oa<b.Fb()&&b.zc(this.g)){d=F.ob(this.g);b=this.Jb?b.$b(this.sa.wc,this.g):b.Yb(this.sa.Uc,this.g);for(var e=0;0<b.Sa.length&&e<this.oa;){var f=K(b),h;if(h=this.Jb?0>=this.g.compare(this.sa.Uc,f):0>=this.g.compare(f,this.sa.wc))d=d.U(f.name,f.S),e++;else break}}else{d=b.ob(this.g);d=d.ga(F);var k,m,l;if(this.Jb){b=d.Ze(this.g);k=this.sa.wc;m=this.sa.Uc;var u=Se(this.g);l=function(a,b){return u(b,a)}}else b=d.Xb(this.g),k=this.sa.Uc,
m=this.sa.wc,l=Se(this.g);for(var e=0,z=!1;0<b.Sa.length;)f=K(b),!z&&0>=l(k,f)&&(z=!0),(h=z&&e<this.oa&&0>=l(f,m))?e++:d=d.U(f.name,F)}return this.sa.Vb().za(a,d,c)};g.ga=function(a){return a};g.Qa=function(){return!0};g.Vb=function(){return this.sa.Vb()};
function lf(a,b,c,d,e,f){var h;if(a.Jb){var k=Se(a.g);h=function(a,b){return k(b,a)}}else h=Se(a.g);E(b.Fb()==a.oa,"");var m=new O(c,d),l=a.Jb?mf(b,a.g):nf(b,a.g),u=a.sa.matches(m);if(b.Fa(c)){for(var z=b.R(c),l=e.fe(a.g,l,a.Jb);null!=l&&(l.name==c||b.Fa(l.name));)l=e.fe(a.g,l,a.Jb);e=null==l?1:h(l,m);if(u&&!d.e()&&0<=e)return null!=f&&nd(f,new H("child_changed",d,c,z)),b.U(c,d);null!=f&&nd(f,new H("child_removed",z,c));b=b.U(c,F);return null!=l&&a.sa.matches(l)?(null!=f&&nd(f,new H("child_added",
l.S,l.name)),b.U(l.name,l.S)):b}return d.e()?b:u&&0<=h(l,m)?(null!=f&&(nd(f,new H("child_removed",l.S,l.name)),nd(f,new H("child_added",d,c))),b.U(c,d).U(l.name,F)):b};function of(a){this.W=a;this.g=a.n.g}function pf(a,b,c,d){var e=[],f=[];Ga(b,function(b){"child_changed"===b.type&&a.g.nd(b.qe,b.Ma)&&f.push(new H("child_moved",b.Ma,b.Za))});qf(a,e,"child_removed",b,d,c);qf(a,e,"child_added",b,d,c);qf(a,e,"child_moved",f,d,c);qf(a,e,"child_changed",b,d,c);qf(a,e,hc,b,d,c);return e}function qf(a,b,c,d,e,f){d=Ha(d,function(a){return a.type===c});Pa(d,r(a.Nf,a));Ga(d,function(c){var d=rf(a,c,f);Ga(e,function(e){e.sf(c.type)&&b.push(e.createEvent(d,a.W))})})}
function rf(a,b,c){"value"!==b.type&&"child_removed"!==b.type&&(b.Dd=c.Ye(b.Za,b.Ma,a.g));return b}of.prototype.Nf=function(a,b){if(null==a.Za||null==b.Za)throw Pc("Should only compare child_ events.");return this.g.compare(new O(a.Za,a.Ma),new O(b.Za,b.Ma))};function sf(){this.Sb=this.na=this.Lb=this.ka=this.xa=!1;this.oa=0;this.oc="";this.ec=null;this.Ab="";this.bc=null;this.yb="";this.g=N}var tf=new sf;function kf(a){return""===a.oc?a.ka:"l"===a.oc}function qd(a){E(a.ka,"Only valid if start has been set");return a.ec}function pd(a){E(a.ka,"Only valid if start has been set");return a.Lb?a.Ab:"[MIN_NAME]"}function sd(a){E(a.na,"Only valid if end has been set");return a.bc}
function rd(a){E(a.na,"Only valid if end has been set");return a.Sb?a.yb:"[MAX_NAME]"}function uf(a){var b=new sf;b.xa=a.xa;b.oa=a.oa;b.ka=a.ka;b.ec=a.ec;b.Lb=a.Lb;b.Ab=a.Ab;b.na=a.na;b.bc=a.bc;b.Sb=a.Sb;b.yb=a.yb;b.g=a.g;return b}g=sf.prototype;g.ne=function(a){var b=uf(this);b.xa=!0;b.oa=a;b.oc="l";return b};g.oe=function(a){var b=uf(this);b.xa=!0;b.oa=a;b.oc="r";return b};g.Nd=function(a,b){var c=uf(this);c.ka=!0;p(a)||(a=null);c.ec=a;null!=b?(c.Lb=!0,c.Ab=b):(c.Lb=!1,c.Ab="");return c};
g.fd=function(a,b){var c=uf(this);c.na=!0;p(a)||(a=null);c.bc=a;p(b)?(c.Sb=!0,c.yb=b):(c.Eg=!1,c.yb="");return c};function vf(a,b){var c=uf(a);c.g=b;return c}function wf(a){var b={};a.ka&&(b.sp=a.ec,a.Lb&&(b.sn=a.Ab));a.na&&(b.ep=a.bc,a.Sb&&(b.en=a.yb));if(a.xa){b.l=a.oa;var c=a.oc;""===c&&(c=kf(a)?"l":"r");b.vf=c}a.g!==N&&(b.i=a.g.toString());return b}function T(a){return!(a.ka||a.na||a.xa)}function xf(a){return T(a)&&a.g==N}
function yf(a){var b={};if(xf(a))return b;var c;a.g===N?c="$priority":a.g===$e?c="$value":a.g===Md?c="$key":(E(a.g instanceof Ue,"Unrecognized index type!"),c=a.g.toString());b.orderBy=B(c);a.ka&&(b.startAt=B(a.ec),a.Lb&&(b.startAt+=","+B(a.Ab)));a.na&&(b.endAt=B(a.bc),a.Sb&&(b.endAt+=","+B(a.yb)));a.xa&&(kf(a)?b.limitToFirst=a.oa:b.limitToLast=a.oa);return b}g.toString=function(){return B(wf(this))};function Oe(a,b){this.B=a;E(p(this.B)&&null!==this.B,"LeafNode shouldn't be created with null/undefined value.");this.aa=b||F;zf(this.aa);this.Eb=null}var Af=["object","boolean","number","string"];g=Oe.prototype;g.J=function(){return!0};g.C=function(){return this.aa};g.ga=function(a){return new Oe(this.B,a)};g.R=function(a){return".priority"===a?this.aa:F};g.Q=function(a){return a.e()?this:".priority"===J(a)?this.aa:F};g.Fa=function(){return!1};g.Ye=function(){return null};
g.U=function(a,b){return".priority"===a?this.ga(b):b.e()&&".priority"!==a?this:F.U(a,b).ga(this.aa)};g.F=function(a,b){var c=J(a);if(null===c)return b;if(b.e()&&".priority"!==c)return this;E(".priority"!==c||1===Hd(a),".priority must be the last token in a path");return this.U(c,F.F(D(a),b))};g.e=function(){return!1};g.Fb=function(){return 0};g.P=function(){return!1};g.H=function(a){return a&&!this.C().e()?{".value":this.Ea(),".priority":this.C().H()}:this.Ea()};
g.hash=function(){if(null===this.Eb){var a="";this.aa.e()||(a+="priority:"+Bf(this.aa.H())+":");var b=typeof this.B,a=a+(b+":"),a="number"===b?a+gd(this.B):a+this.B;this.Eb=Rc(a)}return this.Eb};g.Ea=function(){return this.B};g.tc=function(a){if(a===F)return 1;if(a instanceof P)return-1;E(a.J(),"Unknown node type");var b=typeof a.B,c=typeof this.B,d=Fa(Af,b),e=Fa(Af,c);E(0<=d,"Unknown leaf type: "+b);E(0<=e,"Unknown leaf type: "+c);return d===e?"object"===c?0:this.B<a.B?-1:this.B===a.B?0:1:e-d};
g.ob=function(){return this};g.zc=function(){return!0};g.ca=function(a){return a===this?!0:a.J()?this.B===a.B&&this.aa.ca(a.aa):!1};g.toString=function(){return B(this.H(!0))};function P(a,b,c){this.k=a;(this.aa=b)&&zf(this.aa);a.e()&&E(!this.aa||this.aa.e(),"An empty node cannot have a priority");this.zb=c;this.Eb=null}g=P.prototype;g.J=function(){return!1};g.C=function(){return this.aa||F};g.ga=function(a){return this.k.e()?this:new P(this.k,a,this.zb)};g.R=function(a){if(".priority"===a)return this.C();a=this.k.get(a);return null===a?F:a};g.Q=function(a){var b=J(a);return null===b?this:this.R(b).Q(D(a))};g.Fa=function(a){return null!==this.k.get(a)};
g.U=function(a,b){E(b,"We should always be passing snapshot nodes");if(".priority"===a)return this.ga(b);var c=new O(a,b),d,e;b.e()?(d=this.k.remove(a),c=gf(this.zb,c,this.k)):(d=this.k.Ra(a,b),c=df(this.zb,c,this.k));e=d.e()?F:this.aa;return new P(d,e,c)};g.F=function(a,b){var c=J(a);if(null===c)return b;E(".priority"!==J(a)||1===Hd(a),".priority must be the last token in a path");var d=this.R(c).F(D(a),b);return this.U(c,d)};g.e=function(){return this.k.e()};g.Fb=function(){return this.k.count()};
var Cf=/^(0|[1-9]\d*)$/;g=P.prototype;g.H=function(a){if(this.e())return null;var b={},c=0,d=0,e=!0;this.P(N,function(f,h){b[f]=h.H(a);c++;e&&Cf.test(f)?d=Math.max(d,Number(f)):e=!1});if(!a&&e&&d<2*c){var f=[],h;for(h in b)f[h]=b[h];return f}a&&!this.C().e()&&(b[".priority"]=this.C().H());return b};g.hash=function(){if(null===this.Eb){var a="";this.C().e()||(a+="priority:"+Bf(this.C().H())+":");this.P(N,function(b,c){var d=c.hash();""!==d&&(a+=":"+b+":"+d)});this.Eb=""===a?"":Rc(a)}return this.Eb};
g.Ye=function(a,b,c){return(c=Df(this,c))?(a=Cc(c,new O(a,b)))?a.name:null:Cc(this.k,a)};function mf(a,b){var c;c=(c=Df(a,b))?(c=c.Hc())&&c.name:a.k.Hc();return c?new O(c,a.k.get(c)):null}function nf(a,b){var c;c=(c=Df(a,b))?(c=c.fc())&&c.name:a.k.fc();return c?new O(c,a.k.get(c)):null}g.P=function(a,b){var c=Df(this,a);return c?c.ia(function(a){return b(a.name,a.S)}):this.k.ia(b)};g.Xb=function(a){return this.Yb(a.Ic(),a)};
g.Yb=function(a,b){var c=Df(this,b);if(c)return c.Yb(a,function(a){return a});for(var c=this.k.Yb(a.name,ef),d=Ec(c);null!=d&&0>b.compare(d,a);)K(c),d=Ec(c);return c};g.Ze=function(a){return this.$b(a.Gc(),a)};g.$b=function(a,b){var c=Df(this,b);if(c)return c.$b(a,function(a){return a});for(var c=this.k.$b(a.name,ef),d=Ec(c);null!=d&&0<b.compare(d,a);)K(c),d=Ec(c);return c};g.tc=function(a){return this.e()?a.e()?0:-1:a.J()||a.e()?1:a===Ve?-1:0};
g.ob=function(a){if(a===Md||ra(this.zb.dc,a.toString()))return this;var b=this.zb,c=this.k;E(a!==Md,"KeyIndex always exists and isn't meant to be added to the IndexMap.");for(var d=[],e=!1,c=c.Xb(ef),f=K(c);f;)e=e||a.yc(f.S),d.push(f),f=K(c);d=e?ff(d,Se(a)):Re;e=a.toString();c=va(b.dc);c[e]=a;a=va(b.od);a[e]=d;return new P(this.k,this.aa,new cf(a,c))};g.zc=function(a){return a===Md||ra(this.zb.dc,a.toString())};
g.ca=function(a){if(a===this)return!0;if(a.J())return!1;if(this.C().ca(a.C())&&this.k.count()===a.k.count()){var b=this.Xb(N);a=a.Xb(N);for(var c=K(b),d=K(a);c&&d;){if(c.name!==d.name||!c.S.ca(d.S))return!1;c=K(b);d=K(a)}return null===c&&null===d}return!1};function Df(a,b){return b===Md?null:a.zb.get(b.toString())}g.toString=function(){return B(this.H(!0))};function S(a,b){if(null===a)return F;var c=null;"object"===typeof a&&".priority"in a?c=a[".priority"]:"undefined"!==typeof b&&(c=b);E(null===c||"string"===typeof c||"number"===typeof c||"object"===typeof c&&".sv"in c,"Invalid priority type found: "+typeof c);"object"===typeof a&&".value"in a&&null!==a[".value"]&&(a=a[".value"]);if("object"!==typeof a||".sv"in a)return new Oe(a,S(c));if(a instanceof Array){var d=F,e=a;t(e,function(a,b){if(Hb(e,b)&&"."!==b.substring(0,1)){var c=S(a);if(c.J()||!c.e())d=
d.U(b,c)}});return d.ga(S(c))}var f=[],h=!1,k=a;Ib(k,function(a){if("string"!==typeof a||"."!==a.substring(0,1)){var b=S(k[a]);b.e()||(h=h||!b.C().e(),f.push(new O(a,b)))}});if(0==f.length)return F;var m=ff(f,af,function(a){return a.name},bf);if(h){var l=ff(f,Se(N));return new P(m,S(c),new cf({".priority":l},{".priority":N}))}return new P(m,S(c),hf)}var Ef=Math.log(2);
function Ff(a){this.count=parseInt(Math.log(a+1)/Ef,10);this.Qe=this.count-1;this.Kf=a+1&parseInt(Array(this.count+1).join("1"),2)}function Gf(a){var b=!(a.Kf&1<<a.Qe);a.Qe--;return b}
function ff(a,b,c,d){function e(b,d){var f=d-b;if(0==f)return null;if(1==f){var l=a[b],u=c?c(l):l;return new Fc(u,l.S,!1,null,null)}var l=parseInt(f/2,10)+b,f=e(b,l),z=e(l+1,d),l=a[l],u=c?c(l):l;return new Fc(u,l.S,!1,f,z)}a.sort(b);var f=function(b){function d(b,h){var k=u-b,z=u;u-=b;var z=e(k+1,z),k=a[k],G=c?c(k):k,z=new Fc(G,k.S,h,null,z);f?f.left=z:l=z;f=z}for(var f=null,l=null,u=a.length,z=0;z<b.count;++z){var G=Gf(b),Bd=Math.pow(2,b.count-(z+1));G?d(Bd,!1):(d(Bd,!1),d(Bd,!0))}return l}(new Ff(a.length));
return null!==f?new Ac(d||b,f):new Ac(d||b)}function Bf(a){return"number"===typeof a?"number:"+gd(a):"string:"+a}function zf(a){if(a.J()){var b=a.H();E("string"===typeof b||"number"===typeof b||"object"===typeof b&&Hb(b,".sv"),"Priority must be a string or number.")}else E(a===Ve||a.e(),"priority of unexpected type.");E(a===Ve||a.C().e(),"Priority nodes can't have a priority of their own.")}var F=new P(new Ac(bf),null,hf);function Hf(){P.call(this,new Ac(bf),F,hf)}ka(Hf,P);g=Hf.prototype;
g.tc=function(a){return a===this?0:1};g.ca=function(a){return a===this};g.C=function(){return this};g.R=function(){return F};g.e=function(){return!1};var Ve=new Hf,Te=new O("[MIN_NAME]",F),Ze=new O("[MAX_NAME]",Ve);function Fd(a,b){this.O=a;this.Ld=b}function Cd(a,b,c,d){return new Fd(new oc(b,c,d),a.Ld)}function Gd(a){return a.O.ea?a.O.j():null}Fd.prototype.u=function(){return this.Ld};function pc(a){return a.Ld.ea?a.Ld.j():null};function If(a,b){this.W=a;var c=a.n,d=new md(c.g),c=T(c)?new md(c.g):c.xa?new jf(c):new od(c);this.nf=new vd(c);var e=b.u(),f=b.O,h=d.za(F,e.j(),null),k=c.za(F,f.j(),null);this.Na=new Fd(new oc(k,f.ea,c.Qa()),new oc(h,e.ea,d.Qa()));this.ab=[];this.Rf=new of(a)}function Jf(a){return a.W}g=If.prototype;g.u=function(){return this.Na.u().j()};g.jb=function(a){var b=pc(this.Na);return b&&(T(this.W.n)||!a.e()&&!b.R(J(a)).e())?b.Q(a):null};g.e=function(){return 0===this.ab.length};g.Ob=function(a){this.ab.push(a)};
g.mb=function(a,b){var c=[];if(b){E(null==a,"A cancel should cancel all event registrations.");var d=this.W.path;Ga(this.ab,function(a){(a=a.Oe(b,d))&&c.push(a)})}if(a){for(var e=[],f=0;f<this.ab.length;++f){var h=this.ab[f];if(!h.matches(a))e.push(h);else if(a.$e()){e=e.concat(this.ab.slice(f+1));break}}this.ab=e}else this.ab=[];return c};
g.gb=function(a,b,c){a.type===ld&&null!==a.source.Ib&&(E(pc(this.Na),"We should always have a full cache before handling merges"),E(Gd(this.Na),"Missing event cache, even though we have a server cache"));var d=this.Na;a=this.nf.gb(d,a,b,c);b=this.nf;c=a.Sd;E(c.O.j().zc(b.V.g),"Event snap not indexed");E(c.u().j().zc(b.V.g),"Server snap not indexed");E(xc(a.Sd.u())||!xc(d.u()),"Once a server snap is complete, it should never go back");this.Na=a.Sd;return Kf(this,a.Lf,a.Sd.O.j(),null)};
function Lf(a,b){var c=a.Na.O,d=[];c.j().J()||c.j().P(N,function(a,b){d.push(new H("child_added",b,a))});c.ea&&d.push(gc(c.j()));return Kf(a,d,c.j(),b)}function Kf(a,b,c,d){return pf(a.Rf,b,c,d?[d]:a.ab)};function Mf(a,b,c){this.f=Vc("p:rest:");this.M=a;this.Hb=b;this.Vd=c;this.$={}}function Nf(a,b){if(p(b))return"tag$"+b;E(xf(a.n),"should have a tag if it's not a default query.");return a.path.toString()}g=Mf.prototype;
g.cf=function(a,b,c,d){var e=a.path.toString();this.f("Listen called for "+e+" "+a.ya());var f=Nf(a,c),h={};this.$[f]=h;a=yf(a.n);var k=this;Of(this,e+".json",a,function(a,b){var u=b;404===a&&(a=u=null);null===a&&k.Hb(e,u,!1,c);A(k.$,f)===h&&d(a?401==a?"permission_denied":"rest_error:"+a:"ok",null)})};g.Df=function(a,b){var c=Nf(a,b);delete this.$[c]};g.pf=function(){};g.re=function(){};g.ff=function(){};g.xd=function(){};g.put=function(){};g.df=function(){};g.ye=function(){};
function Of(a,b,c,d){c=c||{};c.format="export";a.Vd.getToken(!1).then(function(e){(e=e&&e.accessToken)&&(c.auth=e);var f=(a.M.Sc?"https://":"http://")+a.M.host+b+"?"+Jb(c);a.f("Sending REST request for "+f);var h=new XMLHttpRequest;h.onreadystatechange=function(){if(d&&4===h.readyState){a.f("REST Response for "+f+" received. status:",h.status,"response:",h.responseText);var b=null;if(200<=h.status&&300>h.status){try{b=Kb(h.responseText)}catch(c){L("Failed to parse JSON response for "+f+": "+h.responseText)}d(null,
b)}else 401!==h.status&&404!==h.status&&L("Got unsuccessful REST response for "+f+" Status: "+h.status),d(h.status);d=null}};h.open("GET",f,!0);h.send()})};function Pf(a){this.He=a}Pf.prototype.getToken=function(a){return this.He.INTERNAL.getToken(a).then(null,function(a){return a&&"auth/token-not-initialized"===a.code?(I("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(a)})};function Qf(a,b){a.He.INTERNAL.addAuthTokenListener(b)};function Rf(a){this.Mf=a;this.rd=null}Rf.prototype.get=function(){var a=this.Mf.get(),b=va(a);if(this.rd)for(var c in this.rd)b[c]-=this.rd[c];this.rd=a;return b};function Sf(){this.uc={}}function Tf(a,b,c){p(c)||(c=1);Hb(a.uc,b)||(a.uc[b]=0);a.uc[b]+=c}Sf.prototype.get=function(){return va(this.uc)};function Uf(a,b){this.yf={};this.Vc=new Rf(a);this.va=b;var c=1E4+2E4*Math.random();setTimeout(r(this.qf,this),Math.floor(c))}Uf.prototype.qf=function(){var a=this.Vc.get(),b={},c=!1,d;for(d in a)0<a[d]&&Hb(this.yf,d)&&(b[d]=a[d],c=!0);c&&this.va.ye(b);setTimeout(r(this.qf,this),Math.floor(6E5*Math.random()))};var Vf={},Wf={};function Xf(a){a=a.toString();Vf[a]||(Vf[a]=new Sf);return Vf[a]}function Yf(a,b){var c=a.toString();Wf[c]||(Wf[c]=b());return Wf[c]};var Zf=null;"undefined"!==typeof MozWebSocket?Zf=MozWebSocket:"undefined"!==typeof WebSocket&&(Zf=WebSocket);function $f(a,b,c,d){this.Zd=a;this.f=Vc(this.Zd);this.frames=this.Ac=null;this.qb=this.rb=this.Fe=0;this.Xa=Xf(b);a={v:"5"};"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(a.r="f");c&&(a.s=c);d&&(a.ls=d);this.Me=ec(b,"websocket",a)}var ag;
$f.prototype.open=function(a,b){this.kb=b;this.gg=a;this.f("Websocket connecting to "+this.Me);this.xc=!1;Xb.set("previous_websocket_failure",!0);try{this.La=new Zf(this.Me)}catch(c){this.f("Error instantiating WebSocket.");var d=c.message||c.data;d&&this.f(d);this.fb();return}var e=this;this.La.onopen=function(){e.f("Websocket connected.");e.xc=!0};this.La.onclose=function(){e.f("Websocket connection was disconnected.");e.La=null;e.fb()};this.La.onmessage=function(a){if(null!==e.La)if(a=a.data,e.qb+=
a.length,Tf(e.Xa,"bytes_received",a.length),bg(e),null!==e.frames)cg(e,a);else{a:{E(null===e.frames,"We already have a frame buffer");if(6>=a.length){var b=Number(a);if(!isNaN(b)){e.Fe=b;e.frames=[];a=null;break a}}e.Fe=1;e.frames=[]}null!==a&&cg(e,a)}};this.La.onerror=function(a){e.f("WebSocket error.  Closing connection.");(a=a.message||a.data)&&e.f(a);e.fb()}};$f.prototype.start=function(){};
$f.isAvailable=function(){var a=!1;if("undefined"!==typeof navigator&&navigator.userAgent){var b=navigator.userAgent.match(/Android ([0-9]{0,}\.[0-9]{0,})/);b&&1<b.length&&4.4>parseFloat(b[1])&&(a=!0)}return!a&&null!==Zf&&!ag};$f.responsesRequiredToBeHealthy=2;$f.healthyTimeout=3E4;g=$f.prototype;g.sd=function(){Xb.remove("previous_websocket_failure")};function cg(a,b){a.frames.push(b);if(a.frames.length==a.Fe){var c=a.frames.join("");a.frames=null;c=Kb(c);a.gg(c)}}
g.send=function(a){bg(this);a=B(a);this.rb+=a.length;Tf(this.Xa,"bytes_sent",a.length);a=ed(a,16384);1<a.length&&dg(this,String(a.length));for(var b=0;b<a.length;b++)dg(this,a[b])};g.Tc=function(){this.Bb=!0;this.Ac&&(clearInterval(this.Ac),this.Ac=null);this.La&&(this.La.close(),this.La=null)};g.fb=function(){this.Bb||(this.f("WebSocket is closing itself"),this.Tc(),this.kb&&(this.kb(this.xc),this.kb=null))};g.close=function(){this.Bb||(this.f("WebSocket is being closed"),this.Tc())};
function bg(a){clearInterval(a.Ac);a.Ac=setInterval(function(){a.La&&dg(a,"0");bg(a)},Math.floor(45E3))}function dg(a,b){try{a.La.send(b)}catch(c){a.f("Exception thrown from WebSocket.send():",c.message||c.data,"Closing connection."),setTimeout(r(a.fb,a),0)}};function eg(a,b,c,d){this.Zd=a;this.f=Vc(a);this.kc=b;this.qb=this.rb=0;this.Xa=Xf(b);this.Af=c;this.xc=!1;this.Db=d;this.Yc=function(a){return ec(b,"long_polling",a)}}var fg,gg;
eg.prototype.open=function(a,b){this.Pe=0;this.ja=b;this.ef=new Qb(a);this.Bb=!1;var c=this;this.tb=setTimeout(function(){c.f("Timed out trying to connect.");c.fb();c.tb=null},Math.floor(3E4));$c(function(){if(!c.Bb){c.Wa=new hg(function(a,b,d,k,m){ig(c,arguments);if(c.Wa)if(c.tb&&(clearTimeout(c.tb),c.tb=null),c.xc=!0,"start"==a)c.id=b,c.lf=d;else if("close"===a)b?(c.Wa.Kd=!1,Rb(c.ef,b,function(){c.fb()})):c.fb();else throw Error("Unrecognized command received: "+a);},function(a,b){ig(c,arguments);
Sb(c.ef,a,b)},function(){c.fb()},c.Yc);var a={start:"t"};a.ser=Math.floor(1E8*Math.random());c.Wa.Qd&&(a.cb=c.Wa.Qd);a.v="5";c.Af&&(a.s=c.Af);c.Db&&(a.ls=c.Db);"undefined"!==typeof location&&location.href&&-1!==location.href.indexOf("firebaseio.com")&&(a.r="f");a=c.Yc(a);c.f("Connecting via long-poll to "+a);jg(c.Wa,a,function(){})}})};
eg.prototype.start=function(){var a=this.Wa,b=this.lf;a.eg=this.id;a.fg=b;for(a.Ud=!0;kg(a););a=this.id;b=this.lf;this.gc=document.createElement("iframe");var c={dframe:"t"};c.id=a;c.pw=b;this.gc.src=this.Yc(c);this.gc.style.display="none";document.body.appendChild(this.gc)};
eg.isAvailable=function(){return fg||!gg&&"undefined"!==typeof document&&null!=document.createElement&&!("object"===typeof window&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))&&!("object"===typeof Windows&&"object"===typeof Windows.Bg)&&!0};g=eg.prototype;g.sd=function(){};g.Tc=function(){this.Bb=!0;this.Wa&&(this.Wa.close(),this.Wa=null);this.gc&&(document.body.removeChild(this.gc),this.gc=null);this.tb&&(clearTimeout(this.tb),this.tb=null)};
g.fb=function(){this.Bb||(this.f("Longpoll is closing itself"),this.Tc(),this.ja&&(this.ja(this.xc),this.ja=null))};g.close=function(){this.Bb||(this.f("Longpoll is being closed."),this.Tc())};g.send=function(a){a=B(a);this.rb+=a.length;Tf(this.Xa,"bytes_sent",a.length);a=Nb(a);a=wb(a,!0);a=ed(a,1840);for(var b=0;b<a.length;b++){var c=this.Wa;c.Qc.push({tg:this.Pe,zg:a.length,Re:a[b]});c.Ud&&kg(c);this.Pe++}};function ig(a,b){var c=B(b).length;a.qb+=c;Tf(a.Xa,"bytes_received",c)}
function hg(a,b,c,d){this.Yc=d;this.kb=c;this.ve=new Ge;this.Qc=[];this.$d=Math.floor(1E8*Math.random());this.Kd=!0;this.Qd=Oc();window["pLPCommand"+this.Qd]=a;window["pRTLPCB"+this.Qd]=b;a=document.createElement("iframe");a.style.display="none";if(document.body){document.body.appendChild(a);try{a.contentWindow.document||I("No IE domain setting required")}catch(e){a.src="javascript:void((function(){document.open();document.domain='"+document.domain+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
a.contentDocument?a.ib=a.contentDocument:a.contentWindow?a.ib=a.contentWindow.document:a.document&&(a.ib=a.document);this.Ga=a;a="";this.Ga.src&&"javascript:"===this.Ga.src.substr(0,11)&&(a='<script>document.domain="'+document.domain+'";\x3c/script>');a="<html><body>"+a+"</body></html>";try{this.Ga.ib.open(),this.Ga.ib.write(a),this.Ga.ib.close()}catch(f){I("frame writing exception"),f.stack&&I(f.stack),I(f)}}
hg.prototype.close=function(){this.Ud=!1;if(this.Ga){this.Ga.ib.body.innerHTML="";var a=this;setTimeout(function(){null!==a.Ga&&(document.body.removeChild(a.Ga),a.Ga=null)},Math.floor(0))}var b=this.kb;b&&(this.kb=null,b())};
function kg(a){if(a.Ud&&a.Kd&&a.ve.count()<(0<a.Qc.length?2:1)){a.$d++;var b={};b.id=a.eg;b.pw=a.fg;b.ser=a.$d;for(var b=a.Yc(b),c="",d=0;0<a.Qc.length;)if(1870>=a.Qc[0].Re.length+30+c.length){var e=a.Qc.shift(),c=c+"&seg"+d+"="+e.tg+"&ts"+d+"="+e.zg+"&d"+d+"="+e.Re;d++}else break;lg(a,b+c,a.$d);return!0}return!1}function lg(a,b,c){function d(){a.ve.remove(c);kg(a)}a.ve.add(c,1);var e=setTimeout(d,Math.floor(25E3));jg(a,b,function(){clearTimeout(e);d()})}
function jg(a,b,c){setTimeout(function(){try{if(a.Kd){var d=a.Ga.ib.createElement("script");d.type="text/javascript";d.async=!0;d.src=b;d.onload=d.onreadystatechange=function(){var a=d.readyState;a&&"loaded"!==a&&"complete"!==a||(d.onload=d.onreadystatechange=null,d.parentNode&&d.parentNode.removeChild(d),c())};d.onerror=function(){I("Long-poll script failed to load: "+b);a.Kd=!1;a.close()};a.Ga.ib.body.appendChild(d)}}catch(e){}},Math.floor(1))};function mg(a){ng(this,a)}var og=[eg,$f];function ng(a,b){var c=$f&&$f.isAvailable(),d=c&&!(Xb.bf||!0===Xb.get("previous_websocket_failure"));b.Ag&&(c||L("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),d=!0);if(d)a.Wc=[$f];else{var e=a.Wc=[];fd(og,function(a,b){b&&b.isAvailable()&&e.push(b)})}}function pg(a){if(0<a.Wc.length)return a.Wc[0];throw Error("No transports available");};function qg(a,b,c,d,e,f,h){this.id=a;this.f=Vc("c:"+this.id+":");this.te=c;this.Mc=d;this.ja=e;this.se=f;this.M=b;this.Ad=[];this.Ne=0;this.zf=new mg(b);this.L=0;this.Db=h;this.f("Connection created");rg(this)}
function rg(a){var b=pg(a.zf);a.I=new b("c:"+a.id+":"+a.Ne++,a.M,void 0,a.Db);a.xe=b.responsesRequiredToBeHealthy||0;var c=sg(a,a.I),d=tg(a,a.I);a.Xc=a.I;a.Rc=a.I;a.D=null;a.Cb=!1;setTimeout(function(){a.I&&a.I.open(c,d)},Math.floor(0));b=b.healthyTimeout||0;0<b&&(a.md=setTimeout(function(){a.md=null;a.Cb||(a.I&&102400<a.I.qb?(a.f("Connection exceeded healthy timeout but has received "+a.I.qb+" bytes.  Marking connection healthy."),a.Cb=!0,a.I.sd()):a.I&&10240<a.I.rb?a.f("Connection exceeded healthy timeout but has sent "+
a.I.rb+" bytes.  Leaving connection alive."):(a.f("Closing unhealthy connection after timeout."),a.close()))},Math.floor(b)))}function tg(a,b){return function(c){b===a.I?(a.I=null,c||0!==a.L?1===a.L&&a.f("Realtime connection lost."):(a.f("Realtime connection failed."),"s-"===a.M.bb.substr(0,2)&&(Xb.remove("host:"+a.M.host),a.M.bb=a.M.host)),a.close()):b===a.D?(a.f("Secondary connection lost."),c=a.D,a.D=null,a.Xc!==c&&a.Rc!==c||a.close()):a.f("closing an old connection")}}
function sg(a,b){return function(c){if(2!=a.L)if(b===a.Rc){var d=cd("t",c);c=cd("d",c);if("c"==d){if(d=cd("t",c),"d"in c)if(c=c.d,"h"===d){var d=c.ts,e=c.v,f=c.h;a.xf=c.s;dc(a.M,f);0==a.L&&(a.I.start(),ug(a,a.I,d),"5"!==e&&L("Protocol version mismatch detected"),c=a.zf,(c=1<c.Wc.length?c.Wc[1]:null)&&vg(a,c))}else if("n"===d){a.f("recvd end transmission on primary");a.Rc=a.D;for(c=0;c<a.Ad.length;++c)a.wd(a.Ad[c]);a.Ad=[];wg(a)}else"s"===d?(a.f("Connection shutdown command received. Shutting down..."),
a.se&&(a.se(c),a.se=null),a.ja=null,a.close()):"r"===d?(a.f("Reset packet received.  New host: "+c),dc(a.M,c),1===a.L?a.close():(xg(a),rg(a))):"e"===d?Wc("Server Error: "+c):"o"===d?(a.f("got pong on primary."),yg(a),zg(a)):Wc("Unknown control packet command: "+d)}else"d"==d&&a.wd(c)}else if(b===a.D)if(d=cd("t",c),c=cd("d",c),"c"==d)"t"in c&&(c=c.t,"a"===c?Ag(a):"r"===c?(a.f("Got a reset on secondary, closing it"),a.D.close(),a.Xc!==a.D&&a.Rc!==a.D||a.close()):"o"===c&&(a.f("got pong on secondary."),
a.wf--,Ag(a)));else if("d"==d)a.Ad.push(c);else throw Error("Unknown protocol layer: "+d);else a.f("message on old connection")}}qg.prototype.ua=function(a){Bg(this,{t:"d",d:a})};function wg(a){a.Xc===a.D&&a.Rc===a.D&&(a.f("cleaning up and promoting a connection: "+a.D.Zd),a.I=a.D,a.D=null)}
function Ag(a){0>=a.wf?(a.f("Secondary connection is healthy."),a.Cb=!0,a.D.sd(),a.D.start(),a.f("sending client ack on secondary"),a.D.send({t:"c",d:{t:"a",d:{}}}),a.f("Ending transmission on primary"),a.I.send({t:"c",d:{t:"n",d:{}}}),a.Xc=a.D,wg(a)):(a.f("sending ping on secondary."),a.D.send({t:"c",d:{t:"p",d:{}}}))}qg.prototype.wd=function(a){yg(this);this.te(a)};function yg(a){a.Cb||(a.xe--,0>=a.xe&&(a.f("Primary connection is healthy."),a.Cb=!0,a.I.sd()))}
function vg(a,b){a.D=new b("c:"+a.id+":"+a.Ne++,a.M,a.xf);a.wf=b.responsesRequiredToBeHealthy||0;a.D.open(sg(a,a.D),tg(a,a.D));setTimeout(function(){a.D&&(a.f("Timed out trying to upgrade."),a.D.close())},Math.floor(6E4))}function ug(a,b,c){a.f("Realtime connection established.");a.I=b;a.L=1;a.Mc&&(a.Mc(c,a.xf),a.Mc=null);0===a.xe?(a.f("Primary connection is healthy."),a.Cb=!0):setTimeout(function(){zg(a)},Math.floor(5E3))}
function zg(a){a.Cb||1!==a.L||(a.f("sending ping on primary."),Bg(a,{t:"c",d:{t:"p",d:{}}}))}function Bg(a,b){if(1!==a.L)throw"Connection is not connected";a.Xc.send(b)}qg.prototype.close=function(){2!==this.L&&(this.f("Closing realtime connection."),this.L=2,xg(this),this.ja&&(this.ja(),this.ja=null))};function xg(a){a.f("Shutting down all connections");a.I&&(a.I.close(),a.I=null);a.D&&(a.D.close(),a.D=null);a.md&&(clearTimeout(a.md),a.md=null)};function Cg(a,b,c,d,e,f){this.id=Dg++;this.f=Vc("p:"+this.id+":");this.qd={};this.$={};this.pa=[];this.Pc=0;this.Lc=[];this.ma=!1;this.Va=1E3;this.td=3E5;this.Hb=b;this.Kc=c;this.ue=d;this.M=a;this.pb=this.Ia=this.Db=this.ze=null;this.Vd=e;this.de=!1;this.ke=0;if(f)throw Error("Auth override specified in options, but not supported on non Node.js platforms");this.Je=f||null;this.vb=null;this.Nb=!1;this.Gd={};this.sg=0;this.Ue=!0;this.Bc=this.me=null;Eg(this,0);Fe.Wb().hc("visible",this.ig,this);-1===
a.host.indexOf("fblocal")&&Pe.Wb().hc("online",this.hg,this)}var Dg=0,Fg=0;g=Cg.prototype;g.ua=function(a,b,c){var d=++this.sg;a={r:d,a:a,b:b};this.f(B(a));E(this.ma,"sendRequest call when we're not connected not allowed.");this.Ia.ua(a);c&&(this.Gd[d]=c)};
g.cf=function(a,b,c,d){var e=a.ya(),f=a.path.toString();this.f("Listen called for "+f+" "+e);this.$[f]=this.$[f]||{};E(xf(a.n)||!T(a.n),"listen() called for non-default but complete query");E(!this.$[f][e],"listen() called twice for same path/queryId.");a={G:d,ld:b,og:a,tag:c};this.$[f][e]=a;this.ma&&Gg(this,a)};
function Gg(a,b){var c=b.og,d=c.path.toString(),e=c.ya();a.f("Listen on "+d+" for "+e);var f={p:d};b.tag&&(f.q=wf(c.n),f.t=b.tag);f.h=b.ld();a.ua("q",f,function(f){var k=f.d,m=f.s;if(k&&"object"===typeof k&&Hb(k,"w")){var l=A(k,"w");da(l)&&0<=Fa(l,"no_index")&&L("Using an unspecified index. Consider adding "+('".indexOn": "'+c.n.g.toString()+'"')+" at "+c.path.toString()+" to your security rules for better performance")}(a.$[d]&&a.$[d][e])===b&&(a.f("listen response",f),"ok"!==m&&Hg(a,d,e),b.G&&b.G(m,
k))})}g.pf=function(a){this.pb=a;this.f("Auth token refreshed");this.pb?Ig(this):this.ma&&this.ua("unauth",{},function(){});if(a&&40===a.length||jd(a))this.f("Admin auth credential detected.  Reducing max reconnect time."),this.td=3E4};function Ig(a){if(a.ma&&a.pb){var b=a.pb,c={cred:b};a.Je&&(c.authvar=a.Je);a.ua("auth",c,function(c){var e=c.s;c=c.d||"error";a.pb===b&&("ok"===e?this.ke=0:Jg(a,e,c))})}}
g.Df=function(a,b){var c=a.path.toString(),d=a.ya();this.f("Unlisten called for "+c+" "+d);E(xf(a.n)||!T(a.n),"unlisten() called for non-default but complete query");if(Hg(this,c,d)&&this.ma){var e=wf(a.n);this.f("Unlisten on "+c+" for "+d);c={p:c};b&&(c.q=e,c.t=b);this.ua("n",c)}};g.re=function(a,b,c){this.ma?Kg(this,"o",a,b,c):this.Lc.push({we:a,action:"o",data:b,G:c})};g.ff=function(a,b,c){this.ma?Kg(this,"om",a,b,c):this.Lc.push({we:a,action:"om",data:b,G:c})};
g.xd=function(a,b){this.ma?Kg(this,"oc",a,null,b):this.Lc.push({we:a,action:"oc",data:null,G:b})};function Kg(a,b,c,d,e){c={p:c,d:d};a.f("onDisconnect "+b,c);a.ua(b,c,function(a){e&&setTimeout(function(){e(a.s,a.d)},Math.floor(0))})}g.put=function(a,b,c,d){Lg(this,"p",a,b,c,d)};g.df=function(a,b,c,d){Lg(this,"m",a,b,c,d)};function Lg(a,b,c,d,e,f){d={p:c,d:d};p(f)&&(d.h=f);a.pa.push({action:b,rf:d,G:e});a.Pc++;b=a.pa.length-1;a.ma?Mg(a,b):a.f("Buffering put: "+c)}
function Mg(a,b){var c=a.pa[b].action,d=a.pa[b].rf,e=a.pa[b].G;a.pa[b].pg=a.ma;a.ua(c,d,function(d){a.f(c+" response",d);delete a.pa[b];a.Pc--;0===a.Pc&&(a.pa=[]);e&&e(d.s,d.d)})}g.ye=function(a){this.ma&&(a={c:a},this.f("reportStats",a),this.ua("s",a,function(a){"ok"!==a.s&&this.f("reportStats","Error sending stats: "+a.d)}))};
g.wd=function(a){if("r"in a){this.f("from server: "+B(a));var b=a.r,c=this.Gd[b];c&&(delete this.Gd[b],c(a.b))}else{if("error"in a)throw"A server-side error has occurred: "+a.error;"a"in a&&(b=a.a,a=a.b,this.f("handleServerMessage",b,a),"d"===b?this.Hb(a.p,a.d,!1,a.t):"m"===b?this.Hb(a.p,a.d,!0,a.t):"c"===b?Ng(this,a.p,a.q):"ac"===b?Jg(this,a.s,a.d):"sd"===b?this.ze?this.ze(a):"msg"in a&&"undefined"!==typeof console&&console.log("FIREBASE: "+a.msg.replace("\n","\nFIREBASE: ")):Wc("Unrecognized action received from server: "+
B(b)+"\nAre you using the latest client?"))}};g.Mc=function(a,b){this.f("connection ready");this.ma=!0;this.Bc=(new Date).getTime();this.ue({serverTimeOffset:a-(new Date).getTime()});this.Db=b;if(this.Ue){var c={};c["sdk.js."+firebase.SDK_VERSION.replace(/\./g,"-")]=1;Pb()?c["framework.cordova"]=1:"object"===typeof navigator&&"ReactNative"===navigator.product&&(c["framework.reactnative"]=1);this.ye(c)}Og(this);this.Ue=!1;this.Kc(!0)};
function Eg(a,b){E(!a.Ia,"Scheduling a connect when we're already connected/ing?");a.vb&&clearTimeout(a.vb);a.vb=setTimeout(function(){a.vb=null;Pg(a)},Math.floor(b))}g.ig=function(a){a&&!this.Nb&&this.Va===this.td&&(this.f("Window became visible.  Reducing delay."),this.Va=1E3,this.Ia||Eg(this,0));this.Nb=a};g.hg=function(a){a?(this.f("Browser went online."),this.Va=1E3,this.Ia||Eg(this,0)):(this.f("Browser went offline.  Killing connection."),this.Ia&&this.Ia.close())};
g.hf=function(){this.f("data client disconnected");this.ma=!1;this.Ia=null;for(var a=0;a<this.pa.length;a++){var b=this.pa[a];b&&"h"in b.rf&&b.pg&&(b.G&&b.G("disconnect"),delete this.pa[a],this.Pc--)}0===this.Pc&&(this.pa=[]);this.Gd={};Qg(this)&&(this.Nb?this.Bc&&(3E4<(new Date).getTime()-this.Bc&&(this.Va=1E3),this.Bc=null):(this.f("Window isn't visible.  Delaying reconnect."),this.Va=this.td,this.me=(new Date).getTime()),a=Math.max(0,this.Va-((new Date).getTime()-this.me)),a*=Math.random(),this.f("Trying to reconnect in "+
a+"ms"),Eg(this,a),this.Va=Math.min(this.td,1.3*this.Va));this.Kc(!1)};
function Pg(a){if(Qg(a)){a.f("Making a connection attempt");a.me=(new Date).getTime();a.Bc=null;var b=r(a.wd,a),c=r(a.Mc,a),d=r(a.hf,a),e=a.id+":"+Fg++,f=a.Db,h=!1,k=null,m=function(){k?k.close():(h=!0,d())};a.Ia={close:m,ua:function(a){E(k,"sendRequest call when we're not connected not allowed.");k.ua(a)}};var l=a.de;a.de=!1;a.Vd.getToken(l).then(function(l){h?I("getToken() completed but was canceled"):(I("getToken() completed. Creating connection."),a.pb=l&&l.accessToken,k=new qg(e,a.M,b,c,d,function(b){L(b+
" ("+a.M.toString()+")");a.eb("server_kill")},f))}).then(null,function(b){a.f("Failed to get token: "+b);h||m()})}}g.eb=function(a){I("Interrupting connection for reason: "+a);this.qd[a]=!0;this.Ia?this.Ia.close():(this.vb&&(clearTimeout(this.vb),this.vb=null),this.ma&&this.hf())};g.lc=function(a){I("Resuming connection for reason: "+a);delete this.qd[a];ua(this.qd)&&(this.Va=1E3,this.Ia||Eg(this,0))};
function Ng(a,b,c){c=c?Ia(c,function(a){return dd(a)}).join("$"):"default";(a=Hg(a,b,c))&&a.G&&a.G("permission_denied")}function Hg(a,b,c){b=(new M(b)).toString();var d;p(a.$[b])?(d=a.$[b][c],delete a.$[b][c],0===na(a.$[b])&&delete a.$[b]):d=void 0;return d}
function Jg(a,b,c){I("Auth token revoked: "+b+"/"+c);a.pb=null;a.de=!0;a.Ia.close();"invalid_token"===b&&(a.ke++,3<=a.ke&&(a.Va=3E4,L("Provided authentication credentials are invalid. This usually indicates your FirebaseApp instance was not initialized correctly. Make sure your apiKey and databaseURL match the values provided for your app at https://console.firebase.google.com/, or if you're using a service account, make sure it's authorized to access the specified databaseURL and is from the correct project.")))}
function Og(a){Ig(a);t(a.$,function(b){t(b,function(b){Gg(a,b)})});for(var b=0;b<a.pa.length;b++)a.pa[b]&&Mg(a,b);for(;a.Lc.length;)b=a.Lc.shift(),Kg(a,b.action,b.we,b.data,b.G)}function Qg(a){var b;b=Pe.Wb().ic;return ua(a.qd)&&b};function Rg(a){this.X=a}var Sg=new Rg(new oe(null));function Tg(a,b,c){if(b.e())return new Rg(new oe(c));var d=se(a.X,b);if(null!=d){var e=d.path,d=d.value;b=R(e,b);d=d.F(b,c);return new Rg(a.X.set(e,d))}a=Ld(a.X,b,new oe(c));return new Rg(a)}function Ug(a,b,c){var d=a;Ib(c,function(a,c){d=Tg(d,b.m(a),c)});return d}Rg.prototype.Ed=function(a){if(a.e())return Sg;a=Ld(this.X,a,Q);return new Rg(a)};function Vg(a,b){var c=se(a.X,b);return null!=c?a.X.get(c.path).Q(R(c.path,b)):null}
function Wg(a){var b=[],c=a.X.value;null!=c?c.J()||c.P(N,function(a,c){b.push(new O(a,c))}):a.X.children.ia(function(a,c){null!=c.value&&b.push(new O(a,c.value))});return b}function Xg(a,b){if(b.e())return a;var c=Vg(a,b);return null!=c?new Rg(new oe(c)):new Rg(a.X.subtree(b))}Rg.prototype.e=function(){return this.X.e()};Rg.prototype.apply=function(a){return Yg(C,this.X,a)};
function Yg(a,b,c){if(null!=b.value)return c.F(a,b.value);var d=null;b.children.ia(function(b,f){".priority"===b?(E(null!==f.value,"Priority writes must always be leaf nodes"),d=f.value):c=Yg(a.m(b),f,c)});c.Q(a).e()||null===d||(c=c.F(a.m(".priority"),d));return c};function Zg(){this.T=Sg;this.la=[];this.Cc=-1}function $g(a,b){for(var c=0;c<a.la.length;c++){var d=a.la[c];if(d.Zc===b)return d}return null}g=Zg.prototype;
g.Ed=function(a){var b=Ma(this.la,function(b){return b.Zc===a});E(0<=b,"removeWrite called with nonexistent writeId.");var c=this.la[b];this.la.splice(b,1);for(var d=c.visible,e=!1,f=this.la.length-1;d&&0<=f;){var h=this.la[f];h.visible&&(f>=b&&ah(h,c.path)?d=!1:c.path.contains(h.path)&&(e=!0));f--}if(d){if(e)this.T=bh(this.la,ch,C),this.Cc=0<this.la.length?this.la[this.la.length-1].Zc:-1;else if(c.Ja)this.T=this.T.Ed(c.path);else{var k=this;t(c.children,function(a,b){k.T=k.T.Ed(c.path.m(b))})}return!0}return!1};
g.Ba=function(a,b,c,d){if(c||d){var e=Xg(this.T,a);return!d&&e.e()?b:d||null!=b||null!=Vg(e,C)?(e=bh(this.la,function(b){return(b.visible||d)&&(!c||!(0<=Fa(c,b.Zc)))&&(b.path.contains(a)||a.contains(b.path))},a),b=b||F,e.apply(b)):null}e=Vg(this.T,a);if(null!=e)return e;e=Xg(this.T,a);return e.e()?b:null!=b||null!=Vg(e,C)?(b=b||F,e.apply(b)):null};
g.sc=function(a,b){var c=F,d=Vg(this.T,a);if(d)d.J()||d.P(N,function(a,b){c=c.U(a,b)});else if(b){var e=Xg(this.T,a);b.P(N,function(a,b){var d=Xg(e,new M(a)).apply(b);c=c.U(a,d)});Ga(Wg(e),function(a){c=c.U(a.name,a.S)})}else e=Xg(this.T,a),Ga(Wg(e),function(a){c=c.U(a.name,a.S)});return c};g.$c=function(a,b,c,d){E(c||d,"Either existingEventSnap or existingServerSnap must exist");a=a.m(b);if(null!=Vg(this.T,a))return null;a=Xg(this.T,a);return a.e()?d.Q(b):a.apply(d.Q(b))};
g.rc=function(a,b,c){a=a.m(b);var d=Vg(this.T,a);return null!=d?d:nc(c,b)?Xg(this.T,a).apply(c.j().R(b)):null};g.mc=function(a){return Vg(this.T,a)};g.Xd=function(a,b,c,d,e,f){var h;a=Xg(this.T,a);h=Vg(a,C);if(null==h)if(null!=b)h=a.apply(b);else return[];h=h.ob(f);if(h.e()||h.J())return[];b=[];a=Se(f);e=e?h.$b(c,f):h.Yb(c,f);for(f=K(e);f&&b.length<d;)0!==a(f,c)&&b.push(f),f=K(e);return b};
function ah(a,b){return a.Ja?a.path.contains(b):!!sa(a.children,function(c,d){return a.path.m(d).contains(b)})}function ch(a){return a.visible}
function bh(a,b,c){for(var d=Sg,e=0;e<a.length;++e){var f=a[e];if(b(f)){var h=f.path;if(f.Ja)c.contains(h)?(h=R(c,h),d=Tg(d,h,f.Ja)):h.contains(c)&&(h=R(h,c),d=Tg(d,C,f.Ja.Q(h)));else if(f.children)if(c.contains(h))h=R(c,h),d=Ug(d,h,f.children);else{if(h.contains(c))if(h=R(h,c),h.e())d=Ug(d,C,f.children);else if(f=A(f.children,J(h)))f=f.Q(D(h)),d=Tg(d,C,f)}else throw Pc("WriteRecord should have .snap or .children");}}return d}function dh(a,b){this.Mb=a;this.X=b}g=dh.prototype;
g.Ba=function(a,b,c){return this.X.Ba(this.Mb,a,b,c)};g.sc=function(a){return this.X.sc(this.Mb,a)};g.$c=function(a,b,c){return this.X.$c(this.Mb,a,b,c)};g.mc=function(a){return this.X.mc(this.Mb.m(a))};g.Xd=function(a,b,c,d,e){return this.X.Xd(this.Mb,a,b,c,d,e)};g.rc=function(a,b){return this.X.rc(this.Mb,a,b)};g.m=function(a){return new dh(this.Mb.m(a),this.X)};function Ke(){this.k=this.B=null}Ke.prototype.find=function(a){if(null!=this.B)return this.B.Q(a);if(a.e()||null==this.k)return null;var b=J(a);a=D(a);return this.k.contains(b)?this.k.get(b).find(a):null};function Me(a,b,c){if(b.e())a.B=c,a.k=null;else if(null!==a.B)a.B=a.B.F(b,c);else{null==a.k&&(a.k=new Ge);var d=J(b);a.k.contains(d)||a.k.add(d,new Ke);a=a.k.get(d);b=D(b);Me(a,b,c)}}
function eh(a,b){if(b.e())return a.B=null,a.k=null,!0;if(null!==a.B){if(a.B.J())return!1;var c=a.B;a.B=null;c.P(N,function(b,c){Me(a,new M(b),c)});return eh(a,b)}return null!==a.k?(c=J(b),b=D(b),a.k.contains(c)&&eh(a.k.get(c),b)&&a.k.remove(c),a.k.e()?(a.k=null,!0):!1):!0}function Le(a,b,c){null!==a.B?c(b,a.B):a.P(function(a,e){var f=new M(b.toString()+"/"+a);Le(e,f,c)})}Ke.prototype.P=function(a){null!==this.k&&He(this.k,function(b,c){a(b,c)})};function U(a,b){this.ta=a;this.qa=b}U.prototype.cancel=function(a){x("Firebase.onDisconnect().cancel",0,1,arguments.length);y("Firebase.onDisconnect().cancel",1,a,!0);var b=new Eb;this.ta.xd(this.qa,Fb(b,a));return b.ra};U.prototype.cancel=U.prototype.cancel;U.prototype.remove=function(a){x("Firebase.onDisconnect().remove",0,1,arguments.length);de("Firebase.onDisconnect().remove",this.qa);y("Firebase.onDisconnect().remove",1,a,!0);var b=new Eb;fh(this.ta,this.qa,null,Fb(b,a));return b.ra};
U.prototype.remove=U.prototype.remove;U.prototype.set=function(a,b){x("Firebase.onDisconnect().set",1,2,arguments.length);de("Firebase.onDisconnect().set",this.qa);Wd("Firebase.onDisconnect().set",a,this.qa,!1);y("Firebase.onDisconnect().set",2,b,!0);var c=new Eb;fh(this.ta,this.qa,a,Fb(c,b));return c.ra};U.prototype.set=U.prototype.set;
U.prototype.Kb=function(a,b,c){x("Firebase.onDisconnect().setWithPriority",2,3,arguments.length);de("Firebase.onDisconnect().setWithPriority",this.qa);Wd("Firebase.onDisconnect().setWithPriority",a,this.qa,!1);$d("Firebase.onDisconnect().setWithPriority",2,b);y("Firebase.onDisconnect().setWithPriority",3,c,!0);var d=new Eb;gh(this.ta,this.qa,a,b,Fb(d,c));return d.ra};U.prototype.setWithPriority=U.prototype.Kb;
U.prototype.update=function(a,b){x("Firebase.onDisconnect().update",1,2,arguments.length);de("Firebase.onDisconnect().update",this.qa);if(da(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;L("Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}Zd("Firebase.onDisconnect().update",a,this.qa);y("Firebase.onDisconnect().update",2,b,!0);
c=new Eb;hh(this.ta,this.qa,a,Fb(c,b));return c.ra};U.prototype.update=U.prototype.update;function V(a,b,c){this.A=a;this.W=b;this.g=c}V.prototype.H=function(){x("Firebase.DataSnapshot.val",0,0,arguments.length);return this.A.H()};V.prototype.val=V.prototype.H;V.prototype.Te=function(){x("Firebase.DataSnapshot.exportVal",0,0,arguments.length);return this.A.H(!0)};V.prototype.exportVal=V.prototype.Te;V.prototype.Uf=function(){x("Firebase.DataSnapshot.exists",0,0,arguments.length);return!this.A.e()};V.prototype.exists=V.prototype.Uf;
V.prototype.m=function(a){x("Firebase.DataSnapshot.child",0,1,arguments.length);fa(a)&&(a=String(a));ce("Firebase.DataSnapshot.child",a);var b=new M(a),c=this.W.m(b);return new V(this.A.Q(b),c,N)};V.prototype.child=V.prototype.m;V.prototype.Fa=function(a){x("Firebase.DataSnapshot.hasChild",1,1,arguments.length);ce("Firebase.DataSnapshot.hasChild",a);var b=new M(a);return!this.A.Q(b).e()};V.prototype.hasChild=V.prototype.Fa;
V.prototype.C=function(){x("Firebase.DataSnapshot.getPriority",0,0,arguments.length);return this.A.C().H()};V.prototype.getPriority=V.prototype.C;V.prototype.forEach=function(a){x("Firebase.DataSnapshot.forEach",1,1,arguments.length);y("Firebase.DataSnapshot.forEach",1,a,!1);if(this.A.J())return!1;var b=this;return!!this.A.P(this.g,function(c,d){return a(new V(d,b.W.m(c),N))})};V.prototype.forEach=V.prototype.forEach;
V.prototype.kd=function(){x("Firebase.DataSnapshot.hasChildren",0,0,arguments.length);return this.A.J()?!1:!this.A.e()};V.prototype.hasChildren=V.prototype.kd;V.prototype.getKey=function(){x("Firebase.DataSnapshot.key",0,0,arguments.length);return this.W.getKey()};id(V.prototype,"key",V.prototype.getKey);V.prototype.Fb=function(){x("Firebase.DataSnapshot.numChildren",0,0,arguments.length);return this.A.Fb()};V.prototype.numChildren=V.prototype.Fb;
V.prototype.xb=function(){x("Firebase.DataSnapshot.ref",0,0,arguments.length);return this.W};id(V.prototype,"ref",V.prototype.xb);function ih(a,b,c){this.Qb=a;this.sb=b;this.ub=c||null}g=ih.prototype;g.sf=function(a){return"value"===a};g.createEvent=function(a,b){var c=b.n.g;return new ic("value",this,new V(a.Ma,b.xb(),c))};g.Ub=function(a){var b=this.ub;if("cancel"===a.ge()){E(this.sb,"Raising a cancel event on a listener with no cancel callback");var c=this.sb;return function(){c.call(b,a.error)}}var d=this.Qb;return function(){d.call(b,a.Md)}};g.Oe=function(a,b){return this.sb?new jc(this,a,b):null};
g.matches=function(a){return a instanceof ih?a.Qb&&this.Qb?a.Qb===this.Qb&&a.ub===this.ub:!0:!1};g.$e=function(){return null!==this.Qb};function jh(a,b,c){this.ha=a;this.sb=b;this.ub=c}g=jh.prototype;g.sf=function(a){a="children_added"===a?"child_added":a;return("children_removed"===a?"child_removed":a)in this.ha};g.Oe=function(a,b){return this.sb?new jc(this,a,b):null};
g.createEvent=function(a,b){E(null!=a.Za,"Child events should have a childName.");var c=b.xb().m(a.Za);return new ic(a.type,this,new V(a.Ma,c,b.n.g),a.Dd)};g.Ub=function(a){var b=this.ub;if("cancel"===a.ge()){E(this.sb,"Raising a cancel event on a listener with no cancel callback");var c=this.sb;return function(){c.call(b,a.error)}}var d=this.ha[a.gd];return function(){d.call(b,a.Md,a.Dd)}};
g.matches=function(a){if(a instanceof jh){if(!this.ha||!a.ha)return!0;if(this.ub===a.ub){var b=na(a.ha);if(b===na(this.ha)){if(1===b){var b=oa(a.ha),c=oa(this.ha);return c===b&&(!a.ha[b]||!this.ha[c]||a.ha[b]===this.ha[c])}return ma(this.ha,function(b,c){return a.ha[c]===b})}}}return!1};g.$e=function(){return null!==this.ha};function kh(){this.Aa={}}g=kh.prototype;g.e=function(){return ua(this.Aa)};g.gb=function(a,b,c){var d=a.source.Ib;if(null!==d)return d=A(this.Aa,d),E(null!=d,"SyncTree gave us an op for an invalid query."),d.gb(a,b,c);var e=[];t(this.Aa,function(d){e=e.concat(d.gb(a,b,c))});return e};g.Ob=function(a,b,c,d,e){var f=a.ya(),h=A(this.Aa,f);if(!h){var h=c.Ba(e?d:null),k=!1;h?k=!0:(h=d instanceof P?c.sc(d):F,k=!1);h=new If(a,new Fd(new oc(h,k,!1),new oc(d,e,!1)));this.Aa[f]=h}h.Ob(b);return Lf(h,b)};
g.mb=function(a,b,c){var d=a.ya(),e=[],f=[],h=null!=lh(this);if("default"===d){var k=this;t(this.Aa,function(a,d){f=f.concat(a.mb(b,c));a.e()&&(delete k.Aa[d],T(a.W.n)||e.push(a.W))})}else{var m=A(this.Aa,d);m&&(f=f.concat(m.mb(b,c)),m.e()&&(delete this.Aa[d],T(m.W.n)||e.push(m.W)))}h&&null==lh(this)&&e.push(new W(a.w,a.path));return{rg:e,Sf:f}};function mh(a){return Ha(pa(a.Aa),function(a){return!T(a.W.n)})}g.jb=function(a){var b=null;t(this.Aa,function(c){b=b||c.jb(a)});return b};
function nh(a,b){if(T(b.n))return lh(a);var c=b.ya();return A(a.Aa,c)}function lh(a){return ta(a.Aa,function(a){return T(a.W.n)})||null};function oh(a){this.wa=Q;this.lb=new Zg;this.De={};this.jc={};this.Dc=a}function ph(a,b,c,d,e){var f=a.lb,h=e;E(d>f.Cc,"Stacking an older write on top of newer ones");p(h)||(h=!0);f.la.push({path:b,Ja:c,Zc:d,visible:h});h&&(f.T=Tg(f.T,b,c));f.Cc=d;return e?qh(a,new ac(Ce,b,c)):[]}function rh(a,b,c,d){var e=a.lb;E(d>e.Cc,"Stacking an older merge on top of newer ones");e.la.push({path:b,children:c,Zc:d,visible:!0});e.T=Ug(e.T,b,c);e.Cc=d;c=qe(c);return qh(a,new kd(Ce,b,c))}
function sh(a,b,c){c=c||!1;var d=$g(a.lb,b);if(a.lb.Ed(b)){var e=Q;null!=d.Ja?e=e.set(C,!0):Ib(d.children,function(a,b){e=e.set(new M(a),b)});return qh(a,new Be(d.path,e,c))}return[]}function th(a,b,c){c=qe(c);return qh(a,new kd(Ee,b,c))}function uh(a,b,c,d){d=vh(a,d);if(null!=d){var e=wh(d);d=e.path;e=e.Ib;b=R(d,b);c=new ac(new De(!1,!0,e,!0),b,c);return xh(a,d,c)}return[]}
function yh(a,b,c,d){if(d=vh(a,d)){var e=wh(d);d=e.path;e=e.Ib;b=R(d,b);c=qe(c);c=new kd(new De(!1,!0,e,!0),b,c);return xh(a,d,c)}return[]}
oh.prototype.Ob=function(a,b){var c=a.path,d=null,e=!1;xe(this.wa,c,function(a,b){var f=R(a,c);d=d||b.jb(f);e=e||null!=lh(b)});var f=this.wa.get(c);f?(e=e||null!=lh(f),d=d||f.jb(C)):(f=new kh,this.wa=this.wa.set(c,f));var h;null!=d?h=!0:(h=!1,d=F,Ae(this.wa.subtree(c),function(a,b){var c=b.jb(C);c&&(d=d.U(a,c))}));var k=null!=nh(f,a);if(!k&&!T(a.n)){var m=zh(a);E(!(m in this.jc),"View does not exist, but we have a tag");var l=Ah++;this.jc[m]=l;this.De["_"+l]=m}h=f.Ob(a,b,new dh(c,this.lb),d,h);k||
e||(f=nh(f,a),h=h.concat(Bh(this,a,f)));return h};
oh.prototype.mb=function(a,b,c){var d=a.path,e=this.wa.get(d),f=[];if(e&&("default"===a.ya()||null!=nh(e,a))){f=e.mb(a,b,c);e.e()&&(this.wa=this.wa.remove(d));e=f.rg;f=f.Sf;b=-1!==Ma(e,function(a){return T(a.n)});var h=ve(this.wa,d,function(a,b){return null!=lh(b)});if(b&&!h&&(d=this.wa.subtree(d),!d.e()))for(var d=Ch(d),k=0;k<d.length;++k){var m=d[k],l=m.W,m=Dh(this,m);this.Dc.Ae(Eh(l),Fh(this,l),m.ld,m.G)}if(!h&&0<e.length&&!c)if(b)this.Dc.Od(Eh(a),null);else{var u=this;Ga(e,function(a){a.ya();
var b=u.jc[zh(a)];u.Dc.Od(Eh(a),b)})}Gh(this,e)}return f};oh.prototype.Ba=function(a,b){var c=this.lb,d=ve(this.wa,a,function(b,c){var d=R(b,a);if(d=c.jb(d))return d});return c.Ba(a,d,b,!0)};function Ch(a){return te(a,function(a,c,d){if(c&&null!=lh(c))return[lh(c)];var e=[];c&&(e=mh(c));t(d,function(a){e=e.concat(a)});return e})}function Gh(a,b){for(var c=0;c<b.length;++c){var d=b[c];if(!T(d.n)){var d=zh(d),e=a.jc[d];delete a.jc[d];delete a.De["_"+e]}}}
function Eh(a){return T(a.n)&&!xf(a.n)?a.xb():a}function Bh(a,b,c){var d=b.path,e=Fh(a,b);c=Dh(a,c);b=a.Dc.Ae(Eh(b),e,c.ld,c.G);d=a.wa.subtree(d);if(e)E(null==lh(d.value),"If we're adding a query, it shouldn't be shadowed");else for(e=te(d,function(a,b,c){if(!a.e()&&b&&null!=lh(b))return[Jf(lh(b))];var d=[];b&&(d=d.concat(Ia(mh(b),function(a){return a.W})));t(c,function(a){d=d.concat(a)});return d}),d=0;d<e.length;++d)c=e[d],a.Dc.Od(Eh(c),Fh(a,c));return b}
function Dh(a,b){var c=b.W,d=Fh(a,c);return{ld:function(){return(b.u()||F).hash()},G:function(b){if("ok"===b){if(d){var f=c.path;if(b=vh(a,d)){var h=wh(b);b=h.path;h=h.Ib;f=R(b,f);f=new Zb(new De(!1,!0,h,!0),f);b=xh(a,b,f)}else b=[]}else b=qh(a,new Zb(Ee,c.path));return b}f="Unknown Error";"too_big"===b?f="The data requested exceeds the maximum size that can be accessed with a single request.":"permission_denied"==b?f="Client doesn't have permission to access the desired data.":"unavailable"==b&&
(f="The service is unavailable");f=Error(b+" at "+c.path.toString()+": "+f);f.code=b.toUpperCase();return a.mb(c,null,f)}}}function zh(a){return a.path.toString()+"$"+a.ya()}function wh(a){var b=a.indexOf("$");E(-1!==b&&b<a.length-1,"Bad queryKey.");return{Ib:a.substr(b+1),path:new M(a.substr(0,b))}}function vh(a,b){var c=a.De,d="_"+b;return d in c?c[d]:void 0}function Fh(a,b){var c=zh(b);return A(a.jc,c)}var Ah=1;
function xh(a,b,c){var d=a.wa.get(b);E(d,"Missing sync point for query tag that we're tracking");return d.gb(c,new dh(b,a.lb),null)}function qh(a,b){return Hh(a,b,a.wa,null,new dh(C,a.lb))}function Hh(a,b,c,d,e){if(b.path.e())return Ih(a,b,c,d,e);var f=c.get(C);null==d&&null!=f&&(d=f.jb(C));var h=[],k=J(b.path),m=b.Nc(k);if((c=c.children.get(k))&&m)var l=d?d.R(k):null,k=e.m(k),h=h.concat(Hh(a,m,c,l,k));f&&(h=h.concat(f.gb(b,e,d)));return h}
function Ih(a,b,c,d,e){var f=c.get(C);null==d&&null!=f&&(d=f.jb(C));var h=[];c.children.ia(function(c,f){var l=d?d.R(c):null,u=e.m(c),z=b.Nc(c);z&&(h=h.concat(Ih(a,z,f,l,u)))});f&&(h=h.concat(f.gb(b,e,d)));return h};function X(a,b,c,d){this.w=a;this.path=b;this.n=c;this.Oc=d}
function Jh(a){var b=null,c=null;a.ka&&(b=qd(a));a.na&&(c=sd(a));if(a.g===Md){if(a.ka){if("[MIN_NAME]"!=pd(a))throw Error("Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().");if("string"!==typeof b)throw Error("Query: When ordering by key, the argument passed to startAt(), endAt(),or equalTo() must be a string.");}if(a.na){if("[MAX_NAME]"!=rd(a))throw Error("Query: When ordering by key, you may only pass one argument to startAt(), endAt(), or equalTo().");if("string"!==
typeof c)throw Error("Query: When ordering by key, the argument passed to startAt(), endAt(),or equalTo() must be a string.");}}else if(a.g===N){if(null!=b&&!Vd(b)||null!=c&&!Vd(c))throw Error("Query: When ordering by priority, the first argument passed to startAt(), endAt(), or equalTo() must be a valid priority value (null, a number, or a string).");}else if(E(a.g instanceof Ue||a.g===$e,"unknown index type."),null!=b&&"object"===typeof b||null!=c&&"object"===typeof c)throw Error("Query: First argument passed to startAt(), endAt(), or equalTo() cannot be an object.");
}function Kh(a){if(a.ka&&a.na&&a.xa&&(!a.xa||""===a.oc))throw Error("Query: Can't combine startAt(), endAt(), and limit(). Use limitToFirst() or limitToLast() instead.");}function Lh(a,b){if(!0===a.Oc)throw Error(b+": You can't combine multiple orderBy calls.");}g=X.prototype;g.xb=function(){x("Query.ref",0,0,arguments.length);return new W(this.w,this.path)};
g.hc=function(a,b,c,d){x("Query.on",2,4,arguments.length);ae("Query.on",a,!1);y("Query.on",2,b,!1);var e=Mh("Query.on",c,d);if("value"===a)Nh(this.w,this,new ih(b,e.cancel||null,e.Pa||null));else{var f={};f[a]=b;Nh(this.w,this,new jh(f,e.cancel,e.Pa))}return b};
g.Jc=function(a,b,c){x("Query.off",0,3,arguments.length);ae("Query.off",a,!0);y("Query.off",2,b,!0);Cb("Query.off",3,c);var d=null,e=null;"value"===a?d=new ih(b||null,null,c||null):a&&(b&&(e={},e[a]=b),d=new jh(e,null,c||null));e=this.w;d=".info"===J(this.path)?e.pd.mb(this,d):e.K.mb(this,d);tc(e.da,this.path,d)};
g.jg=function(a,b){function c(k){f&&(f=!1,e.Jc(a,c),b&&b.call(d.Pa,k),h.resolve(k))}x("Query.once",1,4,arguments.length);ae("Query.once",a,!1);y("Query.once",2,b,!0);var d=Mh("Query.once",arguments[2],arguments[3]),e=this,f=!0,h=new Eb;Gb(h.ra);this.hc(a,c,function(b){e.Jc(a,c);d.cancel&&d.cancel.call(d.Pa,b);h.reject(b)});return h.ra};
g.ne=function(a){x("Query.limitToFirst",1,1,arguments.length);if(!fa(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToFirst: First argument must be a positive integer.");if(this.n.xa)throw Error("Query.limitToFirst: Limit was already set (by another call to limit, limitToFirst, or limitToLast).");return new X(this.w,this.path,this.n.ne(a),this.Oc)};
g.oe=function(a){x("Query.limitToLast",1,1,arguments.length);if(!fa(a)||Math.floor(a)!==a||0>=a)throw Error("Query.limitToLast: First argument must be a positive integer.");if(this.n.xa)throw Error("Query.limitToLast: Limit was already set (by another call to limit, limitToFirst, or limitToLast).");return new X(this.w,this.path,this.n.oe(a),this.Oc)};
g.kg=function(a){x("Query.orderByChild",1,1,arguments.length);if("$key"===a)throw Error('Query.orderByChild: "$key" is invalid.  Use Query.orderByKey() instead.');if("$priority"===a)throw Error('Query.orderByChild: "$priority" is invalid.  Use Query.orderByPriority() instead.');if("$value"===a)throw Error('Query.orderByChild: "$value" is invalid.  Use Query.orderByValue() instead.');ce("Query.orderByChild",a);Lh(this,"Query.orderByChild");var b=new M(a);if(b.e())throw Error("Query.orderByChild: cannot pass in empty path.  Use Query.orderByValue() instead.");
b=new Ue(b);b=vf(this.n,b);Jh(b);return new X(this.w,this.path,b,!0)};g.lg=function(){x("Query.orderByKey",0,0,arguments.length);Lh(this,"Query.orderByKey");var a=vf(this.n,Md);Jh(a);return new X(this.w,this.path,a,!0)};g.mg=function(){x("Query.orderByPriority",0,0,arguments.length);Lh(this,"Query.orderByPriority");var a=vf(this.n,N);Jh(a);return new X(this.w,this.path,a,!0)};
g.ng=function(){x("Query.orderByValue",0,0,arguments.length);Lh(this,"Query.orderByValue");var a=vf(this.n,$e);Jh(a);return new X(this.w,this.path,a,!0)};g.Nd=function(a,b){x("Query.startAt",0,2,arguments.length);Wd("Query.startAt",a,this.path,!0);be("Query.startAt",b);var c=this.n.Nd(a,b);Kh(c);Jh(c);if(this.n.ka)throw Error("Query.startAt: Starting point was already set (by another call to startAt or equalTo).");p(a)||(b=a=null);return new X(this.w,this.path,c,this.Oc)};
g.fd=function(a,b){x("Query.endAt",0,2,arguments.length);Wd("Query.endAt",a,this.path,!0);be("Query.endAt",b);var c=this.n.fd(a,b);Kh(c);Jh(c);if(this.n.na)throw Error("Query.endAt: Ending point was already set (by another call to endAt or equalTo).");return new X(this.w,this.path,c,this.Oc)};
g.Qf=function(a,b){x("Query.equalTo",1,2,arguments.length);Wd("Query.equalTo",a,this.path,!1);be("Query.equalTo",b);if(this.n.ka)throw Error("Query.equalTo: Starting point was already set (by another call to endAt or equalTo).");if(this.n.na)throw Error("Query.equalTo: Ending point was already set (by another call to endAt or equalTo).");return this.Nd(a,b).fd(a,b)};
g.toString=function(){x("Query.toString",0,0,arguments.length);for(var a=this.path,b="",c=a.Z;c<a.o.length;c++)""!==a.o[c]&&(b+="/"+encodeURIComponent(String(a.o[c])));return this.w.toString()+(b||"/")};g.ya=function(){var a=dd(wf(this.n));return"{}"===a?"default":a};
function Mh(a,b,c){var d={cancel:null,Pa:null};if(b&&c)d.cancel=b,y(a,3,d.cancel,!0),d.Pa=c,Cb(a,4,d.Pa);else if(b)if("object"===typeof b&&null!==b)d.Pa=b;else if("function"===typeof b)d.cancel=b;else throw Error(Bb(a,3,!0)+" must either be a cancel callback or a context object.");return d}X.prototype.on=X.prototype.hc;X.prototype.off=X.prototype.Jc;X.prototype.once=X.prototype.jg;X.prototype.limitToFirst=X.prototype.ne;X.prototype.limitToLast=X.prototype.oe;X.prototype.orderByChild=X.prototype.kg;
X.prototype.orderByKey=X.prototype.lg;X.prototype.orderByPriority=X.prototype.mg;X.prototype.orderByValue=X.prototype.ng;X.prototype.startAt=X.prototype.Nd;X.prototype.endAt=X.prototype.fd;X.prototype.equalTo=X.prototype.Qf;X.prototype.toString=X.prototype.toString;id(X.prototype,"ref",X.prototype.xb);function Oh(a){a instanceof Ph||Xc("Don't call new Database() directly - please use firebase.database().");this.ta=a;this.ba=new W(a,C);this.INTERNAL=new Qh(this)}var Rh={TIMESTAMP:{".sv":"timestamp"}};g=Oh.prototype;g.app=null;g.of=function(a){Sh(this,"ref");x("database.ref",0,1,arguments.length);return p(a)?this.ba.m(a):this.ba};
g.qg=function(a){Sh(this,"database.refFromURL");x("database.refFromURL",1,1,arguments.length);var b=Yc(a);ee("database.refFromURL",b);var c=b.kc;c.host!==this.ta.M.host&&Xc("database.refFromURL: Host name does not match the current database: (found "+c.host+" but expected "+this.ta.M.host+")");return this.of(b.path.toString())};function Sh(a,b){null===a.ta&&Xc("Cannot call "+b+" on a deleted database.")}g.Zf=function(){x("database.goOffline",0,0,arguments.length);Sh(this,"goOffline");this.ta.eb()};
g.$f=function(){x("database.goOnline",0,0,arguments.length);Sh(this,"goOnline");this.ta.lc()};Object.defineProperty(Oh.prototype,"app",{get:function(){return this.ta.app}});function Qh(a){this.$a=a}Qh.prototype.delete=function(){Sh(this.$a,"delete");var a=Th.Wb(),b=this.$a.ta;A(a.nb,b.app.name)!==b&&Xc("Database "+b.app.name+" has already been deleted.");b.eb();delete a.nb[b.app.name];this.$a.ta=null;this.$a.ba=null;this.$a=this.$a.INTERNAL=null;return Promise.resolve()};Oh.prototype.ref=Oh.prototype.of;
Oh.prototype.refFromURL=Oh.prototype.qg;Oh.prototype.goOnline=Oh.prototype.$f;Oh.prototype.goOffline=Oh.prototype.Zf;Qh.prototype["delete"]=Qh.prototype.delete;function Ph(a,b,c){this.app=c;var d=new Pf(c);this.M=a;this.Xa=Xf(a);this.Vc=null;this.da=new qc;this.vd=1;this.Ua=null;if(b||0<=("object"===typeof window&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i))this.va=new Mf(this.M,r(this.Hb,this),d),setTimeout(r(this.Kc,this,!0),0);else{b=c.options.databaseAuthVariableOverride||null;if(null!==b){if("object"!==ca(b))throw Error("Only objects are supported for option databaseAuthVariableOverride");
try{B(b)}catch(e){throw Error("Invalid authOverride provided: "+e);}}this.va=this.Ua=new Cg(this.M,r(this.Hb,this),r(this.Kc,this),r(this.ue,this),d,b)}var f=this;Qf(d,function(a){f.va.pf(a)});this.xg=Yf(a,r(function(){return new Uf(this.Xa,this.va)},this));this.nc=new ge;this.ie=new fc;this.pd=new oh({Ae:function(a,b,c,d){b=[];c=f.ie.j(a.path);c.e()||(b=qh(f.pd,new ac(Ee,a.path,c)),setTimeout(function(){d("ok")},0));return b},Od:aa});Uh(this,"connected",!1);this.ja=new Ke;this.$a=new Oh(this);this.ed=
0;this.je=null;this.K=new oh({Ae:function(a,b,c,d){f.va.cf(a,c,b,function(b,c){var e=d(b,c);vc(f.da,a.path,e)});return[]},Od:function(a,b){f.va.Df(a,b)}})}g=Ph.prototype;g.toString=function(){return(this.M.Sc?"https://":"http://")+this.M.host};g.name=function(){return this.M.pe};function Vh(a){a=a.ie.j(new M(".info/serverTimeOffset")).H()||0;return(new Date).getTime()+a}function Wh(a){a=a={timestamp:Vh(a)};a.timestamp=a.timestamp||(new Date).getTime();return a}
g.Hb=function(a,b,c,d){this.ed++;var e=new M(a);b=this.je?this.je(a,b):b;a=[];d?c?(b=la(b,function(a){return S(a)}),a=yh(this.K,e,b,d)):(b=S(b),a=uh(this.K,e,b,d)):c?(d=la(b,function(a){return S(a)}),a=th(this.K,e,d)):(d=S(b),a=qh(this.K,new ac(Ee,e,d)));d=e;0<a.length&&(d=Xh(this,e));vc(this.da,d,a)};g.Kc=function(a){Uh(this,"connected",a);!1===a&&Yh(this)};g.ue=function(a){var b=this;fd(a,function(a,d){Uh(b,d,a)})};
function Uh(a,b,c){b=new M("/.info/"+b);c=S(c);var d=a.ie;d.Jd=d.Jd.F(b,c);c=qh(a.pd,new ac(Ee,b,c));vc(a.da,b,c)}g.Kb=function(a,b,c,d){this.f("set",{path:a.toString(),value:b,Dg:c});var e=Wh(this);b=S(b,c);var e=Ne(b,e),f=this.vd++,e=ph(this.K,a,e,f,!0);rc(this.da,e);var h=this;this.va.put(a.toString(),b.H(!0),function(b,c){var e="ok"===b;e||L("set at "+a+" failed: "+b);e=sh(h.K,f,!e);vc(h.da,a,e);Zh(d,b,c)});e=$h(this,a);Xh(this,e);vc(this.da,e,[])};
g.update=function(a,b,c){this.f("update",{path:a.toString(),value:b});var d=!0,e=Wh(this),f={};t(b,function(a,b){d=!1;var c=S(a);f[b]=Ne(c,e)});if(d)I("update() called with empty data.  Don't do anything."),Zh(c,"ok");else{var h=this.vd++,k=rh(this.K,a,f,h);rc(this.da,k);var m=this;this.va.df(a.toString(),b,function(b,d){var e="ok"===b;e||L("update at "+a+" failed: "+b);var e=sh(m.K,h,!e),f=a;0<e.length&&(f=Xh(m,a));vc(m.da,f,e);Zh(c,b,d)});b=$h(this,a);Xh(this,b);vc(this.da,a,[])}};
function Yh(a){a.f("onDisconnectEvents");var b=Wh(a),c=[];Le(Je(a.ja,b),C,function(b,e){c=c.concat(qh(a.K,new ac(Ee,b,e)));var f=$h(a,b);Xh(a,f)});a.ja=new Ke;vc(a.da,C,c)}g.xd=function(a,b){var c=this;this.va.xd(a.toString(),function(d,e){"ok"===d&&eh(c.ja,a);Zh(b,d,e)})};function fh(a,b,c,d){var e=S(c);a.va.re(b.toString(),e.H(!0),function(c,h){"ok"===c&&Me(a.ja,b,e);Zh(d,c,h)})}function gh(a,b,c,d,e){var f=S(c,d);a.va.re(b.toString(),f.H(!0),function(c,d){"ok"===c&&Me(a.ja,b,f);Zh(e,c,d)})}
function hh(a,b,c,d){var e=!0,f;for(f in c)e=!1;e?(I("onDisconnect().update() called with empty data.  Don't do anything."),Zh(d,"ok")):a.va.ff(b.toString(),c,function(e,f){if("ok"===e)for(var m in c){var l=S(c[m]);Me(a.ja,b.m(m),l)}Zh(d,e,f)})}function Nh(a,b,c){c=".info"===J(b.path)?a.pd.Ob(b,c):a.K.Ob(b,c);tc(a.da,b.path,c)}g.eb=function(){this.Ua&&this.Ua.eb("repo_interrupt")};g.lc=function(){this.Ua&&this.Ua.lc("repo_interrupt")};
g.Be=function(a){if("undefined"!==typeof console){a?(this.Vc||(this.Vc=new Rf(this.Xa)),a=this.Vc.get()):a=this.Xa.get();var b=Ja(qa(a),function(a,b){return Math.max(b.length,a)},0),c;for(c in a){for(var d=a[c],e=c.length;e<b+2;e++)c+=" ";console.log(c+d)}}};g.Ce=function(a){Tf(this.Xa,a);this.xg.yf[a]=!0};g.f=function(a){var b="";this.Ua&&(b=this.Ua.id+":");I(b,arguments)};
function Zh(a,b,c){a&&Tb(function(){if("ok"==b)a(null);else{var d=(b||"error").toUpperCase(),e=d;c&&(e+=": "+c);e=Error(e);e.code=d;a(e)}})};function ai(a,b,c,d,e){function f(){}a.f("transaction on "+b);var h=new W(a,b);h.hc("value",f);c={path:b,update:c,G:d,status:null,kf:Oc(),Ie:e,uf:0,Rd:function(){h.Jc("value",f)},Td:null,Da:null,bd:null,cd:null,dd:null};d=a.K.Ba(b,void 0)||F;c.bd=d;d=c.update(d.H());if(p(d)){Xd("transaction failed: Data returned ",d,c.path);c.status=1;e=he(a.nc,b);var k=e.Ea()||[];k.push(c);ie(e,k);"object"===typeof d&&null!==d&&Hb(d,".priority")?(k=A(d,".priority"),E(Vd(k),"Invalid priority returned by transaction. Priority must be a valid string, finite number, server value, or null.")):
k=(a.K.Ba(b)||F).C().H();e=Wh(a);d=S(d,k);e=Ne(d,e);c.cd=d;c.dd=e;c.Da=a.vd++;c=ph(a.K,b,e,c.Da,c.Ie);vc(a.da,b,c);bi(a)}else c.Rd(),c.cd=null,c.dd=null,c.G&&(a=new V(c.bd,new W(a,c.path),N),c.G(null,!1,a))}function bi(a,b){var c=b||a.nc;b||ci(a,c);if(null!==c.Ea()){var d=di(a,c);E(0<d.length,"Sending zero length transaction queue");Ka(d,function(a){return 1===a.status})&&ei(a,c.path(),d)}else c.kd()&&c.P(function(b){bi(a,b)})}
function ei(a,b,c){for(var d=Ia(c,function(a){return a.Da}),e=a.K.Ba(b,d)||F,d=e,e=e.hash(),f=0;f<c.length;f++){var h=c[f];E(1===h.status,"tryToSendTransactionQueue_: items in queue should all be run.");h.status=2;h.uf++;var k=R(b,h.path),d=d.F(k,h.cd)}d=d.H(!0);a.va.put(b.toString(),d,function(d){a.f("transaction put response",{path:b.toString(),status:d});var e=[];if("ok"===d){d=[];for(f=0;f<c.length;f++){c[f].status=3;e=e.concat(sh(a.K,c[f].Da));if(c[f].G){var h=c[f].dd,k=new W(a,c[f].path);d.push(r(c[f].G,
null,null,!0,new V(h,k,N)))}c[f].Rd()}ci(a,he(a.nc,b));bi(a);vc(a.da,b,e);for(f=0;f<d.length;f++)Tb(d[f])}else{if("datastale"===d)for(f=0;f<c.length;f++)c[f].status=4===c[f].status?5:1;else for(L("transaction at "+b.toString()+" failed: "+d),f=0;f<c.length;f++)c[f].status=5,c[f].Td=d;Xh(a,b)}},e)}function Xh(a,b){var c=fi(a,b),d=c.path(),c=di(a,c);gi(a,c,d);return d}
function gi(a,b,c){if(0!==b.length){for(var d=[],e=[],f=Ia(b,function(a){return a.Da}),h=0;h<b.length;h++){var k=b[h],m=R(c,k.path),l=!1,u;E(null!==m,"rerunTransactionsUnderNode_: relativePath should not be null.");if(5===k.status)l=!0,u=k.Td,e=e.concat(sh(a.K,k.Da,!0));else if(1===k.status)if(25<=k.uf)l=!0,u="maxretry",e=e.concat(sh(a.K,k.Da,!0));else{var z=a.K.Ba(k.path,f)||F;k.bd=z;var G=b[h].update(z.H());p(G)?(Xd("transaction failed: Data returned ",G,k.path),m=S(G),"object"===typeof G&&null!=
G&&Hb(G,".priority")||(m=m.ga(z.C())),z=k.Da,G=Wh(a),G=Ne(m,G),k.cd=m,k.dd=G,k.Da=a.vd++,Na(f,z),e=e.concat(ph(a.K,k.path,G,k.Da,k.Ie)),e=e.concat(sh(a.K,z,!0))):(l=!0,u="nodata",e=e.concat(sh(a.K,k.Da,!0)))}vc(a.da,c,e);e=[];l&&(b[h].status=3,setTimeout(b[h].Rd,Math.floor(0)),b[h].G&&("nodata"===u?(k=new W(a,b[h].path),d.push(r(b[h].G,null,null,!1,new V(b[h].bd,k,N)))):d.push(r(b[h].G,null,Error(u),!1,null))))}ci(a,a.nc);for(h=0;h<d.length;h++)Tb(d[h]);bi(a)}}
function fi(a,b){for(var c,d=a.nc;null!==(c=J(b))&&null===d.Ea();)d=he(d,c),b=D(b);return d}function di(a,b){var c=[];hi(a,b,c);c.sort(function(a,b){return a.kf-b.kf});return c}function hi(a,b,c){var d=b.Ea();if(null!==d)for(var e=0;e<d.length;e++)c.push(d[e]);b.P(function(b){hi(a,b,c)})}function ci(a,b){var c=b.Ea();if(c){for(var d=0,e=0;e<c.length;e++)3!==c[e].status&&(c[d]=c[e],d++);c.length=d;ie(b,0<c.length?c:null)}b.P(function(b){ci(a,b)})}
function $h(a,b){var c=fi(a,b).path(),d=he(a.nc,b);le(d,function(b){ii(a,b)});ii(a,d);ke(d,function(b){ii(a,b)});return c}
function ii(a,b){var c=b.Ea();if(null!==c){for(var d=[],e=[],f=-1,h=0;h<c.length;h++)4!==c[h].status&&(2===c[h].status?(E(f===h-1,"All SENT items should be at beginning of queue."),f=h,c[h].status=4,c[h].Td="set"):(E(1===c[h].status,"Unexpected transaction status in abort"),c[h].Rd(),e=e.concat(sh(a.K,c[h].Da,!0)),c[h].G&&d.push(r(c[h].G,null,Error("set"),!1,null))));-1===f?ie(b,null):c.length=f+1;vc(a.da,b.path(),e);for(h=0;h<d.length;h++)Tb(d[h])}};function Th(){this.nb={};this.Ef=!1}Th.prototype.eb=function(){for(var a in this.nb)this.nb[a].eb()};Th.prototype.lc=function(){for(var a in this.nb)this.nb[a].lc()};Th.prototype.ce=function(a){this.Ef=a};ba(Th);Th.prototype.interrupt=Th.prototype.eb;Th.prototype.resume=Th.prototype.lc;var Y={};Y.pc=Cg;Y.DataConnection=Y.pc;Cg.prototype.wg=function(a,b){this.ua("q",{p:a},b)};Y.pc.prototype.simpleListen=Y.pc.prototype.wg;Cg.prototype.Pf=function(a,b){this.ua("echo",{d:a},b)};Y.pc.prototype.echo=Y.pc.prototype.Pf;Cg.prototype.interrupt=Cg.prototype.eb;Y.Hf=qg;Y.RealTimeConnection=Y.Hf;qg.prototype.sendRequest=qg.prototype.ua;qg.prototype.close=qg.prototype.close;
Y.ag=function(a){var b=Cg.prototype.put;Cg.prototype.put=function(c,d,e,f){p(f)&&(f=a());b.call(this,c,d,e,f)};return function(){Cg.prototype.put=b}};Y.hijackHash=Y.ag;Y.Gf=cc;Y.ConnectionTarget=Y.Gf;Y.ya=function(a){return a.ya()};Y.queryIdentifier=Y.ya;Y.dg=function(a){return a.w.Ua.$};Y.listens=Y.dg;Y.ce=function(a){Th.Wb().ce(a)};Y.forceRestClient=Y.ce;Y.Context=Th;var Z={Wf:function(){fg=ag=!0}};Z.forceLongPolling=Z.Wf;Z.Xf=function(){gg=!0};Z.forceWebSockets=Z.Xf;Z.cg=function(){return $f.isAvailable()};Z.isWebSocketsAvailable=Z.cg;Z.vg=function(a,b){a.w.Ua.ze=b};Z.setSecurityDebugCallback=Z.vg;Z.Be=function(a,b){a.w.Be(b)};Z.stats=Z.Be;Z.Ce=function(a,b){a.w.Ce(b)};Z.statsIncrementCounter=Z.Ce;Z.ed=function(a){return a.w.ed};Z.dataUpdateCount=Z.ed;Z.bg=function(a,b){a.w.je=b};Z.interceptServerData=Z.bg;function ji(a,b){this.committed=a;this.snapshot=b};function W(a,b){if(!(a instanceof Ph))throw Error("new Firebase() no longer supported - use app.database().");X.call(this,a,b,tf,!1);this.then=void 0;this["catch"]=void 0}ka(W,X);g=W.prototype;g.getKey=function(){x("Firebase.key",0,0,arguments.length);return this.path.e()?null:Id(this.path)};
g.m=function(a){x("Firebase.child",1,1,arguments.length);if(fa(a))a=String(a);else if(!(a instanceof M))if(null===J(this.path)){var b=a;b&&(b=b.replace(/^\/*\.info(\/|$)/,"/"));ce("Firebase.child",b)}else ce("Firebase.child",a);return new W(this.w,this.path.m(a))};g.getParent=function(){x("Firebase.parent",0,0,arguments.length);var a=this.path.parent();return null===a?null:new W(this.w,a)};
g.Yf=function(){x("Firebase.ref",0,0,arguments.length);for(var a=this;null!==a.getParent();)a=a.getParent();return a};g.Of=function(){return this.w.$a};g.set=function(a,b){x("Firebase.set",1,2,arguments.length);de("Firebase.set",this.path);Wd("Firebase.set",a,this.path,!1);y("Firebase.set",2,b,!0);var c=new Eb;this.w.Kb(this.path,a,null,Fb(c,b));return c.ra};
g.update=function(a,b){x("Firebase.update",1,2,arguments.length);de("Firebase.update",this.path);if(da(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;L("Passing an Array to Firebase.update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}Zd("Firebase.update",a,this.path);y("Firebase.update",2,b,!0);c=new Eb;this.w.update(this.path,a,Fb(c,b));return c.ra};
g.Kb=function(a,b,c){x("Firebase.setWithPriority",2,3,arguments.length);de("Firebase.setWithPriority",this.path);Wd("Firebase.setWithPriority",a,this.path,!1);$d("Firebase.setWithPriority",2,b);y("Firebase.setWithPriority",3,c,!0);if(".length"===this.getKey()||".keys"===this.getKey())throw"Firebase.setWithPriority failed: "+this.getKey()+" is a read-only object.";var d=new Eb;this.w.Kb(this.path,a,b,Fb(d,c));return d.ra};
g.remove=function(a){x("Firebase.remove",0,1,arguments.length);de("Firebase.remove",this.path);y("Firebase.remove",1,a,!0);return this.set(null,a)};
g.transaction=function(a,b,c){x("Firebase.transaction",1,3,arguments.length);de("Firebase.transaction",this.path);y("Firebase.transaction",1,a,!1);y("Firebase.transaction",2,b,!0);if(p(c)&&"boolean"!=typeof c)throw Error(Bb("Firebase.transaction",3,!0)+"must be a boolean.");if(".length"===this.getKey()||".keys"===this.getKey())throw"Firebase.transaction failed: "+this.getKey()+" is a read-only object.";"undefined"===typeof c&&(c=!0);var d=new Eb;ga(b)&&Gb(d.ra);ai(this.w,this.path,a,function(a,c,
h){a?d.reject(a):d.resolve(new ji(c,h));ga(b)&&b(a,c,h)},c);return d.ra};g.ug=function(a,b){x("Firebase.setPriority",1,2,arguments.length);de("Firebase.setPriority",this.path);$d("Firebase.setPriority",1,a);y("Firebase.setPriority",2,b,!0);var c=new Eb;this.w.Kb(this.path.m(".priority"),a,null,Fb(c,b));return c.ra};
g.push=function(a,b){x("Firebase.push",0,2,arguments.length);de("Firebase.push",this.path);Wd("Firebase.push",a,this.path,!0);y("Firebase.push",2,b,!0);var c=Vh(this.w),d=Nd(c),c=this.m(d);if(null!=a){var e=this,f=c.set(a,b).then(function(){return e.m(d)});c.then=r(f.then,f);c["catch"]=r(f.then,f,void 0);ga(b)&&Gb(f)}return c};g.kb=function(){de("Firebase.onDisconnect",this.path);return new U(this.w,this.path)};W.prototype.child=W.prototype.m;W.prototype.set=W.prototype.set;W.prototype.update=W.prototype.update;
W.prototype.setWithPriority=W.prototype.Kb;W.prototype.remove=W.prototype.remove;W.prototype.transaction=W.prototype.transaction;W.prototype.setPriority=W.prototype.ug;W.prototype.push=W.prototype.push;W.prototype.onDisconnect=W.prototype.kb;id(W.prototype,"database",W.prototype.Of);id(W.prototype,"key",W.prototype.getKey);id(W.prototype,"parent",W.prototype.getParent);id(W.prototype,"root",W.prototype.Yf);if("undefined"===typeof firebase)throw Error("Cannot install Firebase Database - be sure to load firebase-app.js first.");
try{firebase.INTERNAL.registerService("database",function(a){var b=Th.Wb(),c=a.options.databaseURL;p(c)||Xc("Can't determine Firebase Database URL.  Be sure to include databaseURL option when calling firebase.intializeApp().");var d=Yc(c),c=d.kc;ee("Invalid Firebase Database URL",d);d.path.e()||Xc("Database URL must point to the root of a Firebase Database (not including a child path).");(d=A(b.nb,a.name))&&Xc("FIREBASE INTERNAL ERROR: Database initialized multiple times.");d=new Ph(c,b.Ef,a);b.nb[a.name]=
d;return d.$a},{Reference:W,Query:X,Database:Oh,enableLogging:Uc,INTERNAL:Z,TEST_ACCESS:Y,ServerValue:Rh})}catch(ki){Xc("Failed to register the Firebase Database Service ("+ki+")")};})();

(function() {var k,aa=aa||{},m=this,n=function(a){return void 0!==a},ba=function(){},p=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=
typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";else if("function"==b&&"undefined"==typeof a.call)return"object";return b},ca=function(a){var b=p(a);return"array"==b||"object"==b&&"number"==typeof a.length},q=function(a){return"string"==typeof a},r=function(a){return"function"==p(a)},da=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b},ea="closure_uid_"+(1E9*Math.random()>>>0),fa=0,ga=function(a,b,c){return a.call.apply(a.bind,
arguments)},ha=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}},t=function(a,b,c){t=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ga:ha;return t.apply(null,arguments)},ia=Date.now||function(){return+new Date},u=function(a,b){function c(){}
c.prototype=b.prototype;a.J=b.prototype;a.prototype=new c;a.Ma=function(a,c,f){for(var g=Array(arguments.length-2),h=2;h<arguments.length;h++)g[h-2]=arguments[h];return b.prototype[c].apply(a,g)}};var ja=function(a,b,c){function d(){N||(N=!0,b.apply(null,arguments))}function e(b){l=setTimeout(function(){l=null;a(f,2===x)},b)}function f(a,b){if(!N)if(a)d.apply(null,arguments);else if(2===x||B)d.apply(null,arguments);else{64>h&&(h*=2);var c;1===x?(x=2,c=0):c=1E3*(h+Math.random());e(c)}}function g(a){Ub||(Ub=!0,N||(null!==l?(a||(x=2),clearTimeout(l),e(0)):a||(x=1)))}var h=1,l=null,B=!1,x=0,N=!1,Ub=!1;e(0);setTimeout(function(){B=!0;g(!0)},c);return g};var ka="https://firebasestorage.googleapis.com";var v=function(a,b){this.code="storage/"+a;this.message="Firebase Storage: "+b;this.serverResponse=null;this.name="FirebaseError"};u(v,Error);var la=function(){return new v("unknown","An unknown error occurred, please check the error payload for server response.")},ma=function(){return new v("canceled","User canceled the upload/download.")},na=function(a,b,c){return new v("invalid-argument","Invalid argument in `"+b+"` at index "+a+": "+c)},oa=function(){return new v("app-deleted","The Firebase app was deleted.")};var pa=function(a,b){for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&b(c,a[c])},qa=function(a){var b={};pa(a,function(a,d){b[a]=d});return b};var w=function(a,b,c,d){this.l=a;this.f={};this.i=b;this.b={};this.c="";this.N=c;this.g=this.a=null;this.h=[200];this.j=d};var ra={STATE_CHANGED:"state_changed"},sa={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"},ta=function(a){switch(a){case "running":case "pausing":case "canceling":return"running";case "paused":return"paused";case "success":return"success";case "canceled":return"canceled";case "error":return"error";default:return"error"}};var y=function(a){return n(a)&&null!==a},ua=function(a){return"string"===typeof a||a instanceof String};var va=function(a,b,c){this.f=c;this.c=a;this.g=b;this.b=0;this.a=null};va.prototype.get=function(){var a;0<this.b?(this.b--,a=this.a,this.a=a.next,a.next=null):a=this.c();return a};var wa=function(a,b){a.g(b);a.b<a.f&&(a.b++,b.next=a.a,a.a=b)};var xa=function(a){if(Error.captureStackTrace)Error.captureStackTrace(this,xa);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))};u(xa,Error);xa.prototype.name="CustomError";var ya=function(a,b,c,d,e){this.reset(a,b,c,d,e)};ya.prototype.a=null;var za=0;ya.prototype.reset=function(a,b,c,d,e){"number"==typeof e||za++;d||ia();this.b=b;delete this.a};var Aa=function(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b},Ba=function(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b},Ca="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),Da=function(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<Ca.length;f++)c=Ca[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};var Ea=function(a){a.prototype.then=a.prototype.then;a.prototype.$goog_Thenable=!0},Fa=function(a){if(!a)return!1;try{return!!a.$goog_Thenable}catch(b){return!1}};var Ga=function(a){Ga[" "](a);return a};Ga[" "]=ba;var Ha=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")},Ia=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")},Ja=function(a,b){return a<b?-1:a>b?1:0};var Ka=function(a,b){this.a=a;this.b=b};Ka.prototype.clone=function(){return new Ka(this.a,this.b)};var z=function(a,b){this.bucket=a;this.path=b},La=function(a){var b=encodeURIComponent;return"/b/"+b(a.bucket)+"/o/"+b(a.path)},Ma=function(a){for(var b=null,c=[{ka:/^gs:\/\/([A-Za-z0-9.\-]+)(\/(.*))?$/i,da:{bucket:1,path:3},ja:function(a){"/"===a.path.charAt(a.path.length-1)&&(a.path=a.path.slice(0,-1))}},{ka:/^https?:\/\/firebasestorage\.googleapis\.com\/v[A-Za-z0-9_]+\/b\/([A-Za-z0-9.\-]+)\/o(\/([^?#]*).*)?$/i,da:{bucket:1,path:3},ja:function(a){a.path=decodeURIComponent(a.path)}}],d=0;d<c.length;d++){var e=
c[d],f=e.ka.exec(a);if(f){b=f[e.da.bucket];(f=f[e.da.path])||(f="");b=new z(b,f);e.ja(b);break}}if(null==b)throw new v("invalid-url","Invalid URL '"+a+"'.");return b};var Na=function(a,b,c){r(a)||y(b)||y(c)?(this.next=a,this.error=b||null,this.a=c||null):(this.next=a.next||null,this.error=a.error||null,this.a=a.complete||null)};var Oa=function(a){var b=encodeURIComponent,c="?";pa(a,function(a,e){a=b(a)+"="+b(e);c=c+a+"&"});return c=c.slice(0,-1)};var A=function(a,b,c,d,e,f){this.b=a;this.h=b;this.f=c;this.a=d;this.g=e;this.c=f};k=A.prototype;k.qa=function(){return this.b};k.La=function(){return this.h};k.Ia=function(){return this.f};k.Da=function(){return this.a};k.sa=function(){if(y(this.a)){var a=this.a.downloadURLs;return y(a)&&y(a[0])?a[0]:null}return null};k.Ka=function(){return this.g};k.Ga=function(){return this.c};var Pa=function(a,b){b.unshift(a);xa.call(this,Ha.apply(null,b));b.shift()};u(Pa,xa);Pa.prototype.name="AssertionError";
var Qa=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),f=d;else a&&(e+=": "+a,f=b);throw new Pa(""+e,f||[]);},C=function(a,b,c){a||Qa("",null,b,Array.prototype.slice.call(arguments,2))},Ra=function(a,b){throw new Pa("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));},Sa=function(a,b,c){r(a)||Qa("Expected function but got %s: %s.",[p(a),a],b,Array.prototype.slice.call(arguments,2))};var D=function(){this.g=this.g;this.s=this.s};D.prototype.g=!1;D.prototype.ga=function(){this.g||(this.g=!0,this.C())};D.prototype.C=function(){if(this.s)for(;this.s.length;)this.s.shift()()};var Ta="closure_listenable_"+(1E6*Math.random()|0),Ua=0;var Wa;a:{var Xa=m.navigator;if(Xa){var Ya=Xa.userAgent;if(Ya){Wa=Ya;break a}}Wa=""}var E=function(a){return-1!=Wa.indexOf(a)};var Za=function(){};Za.prototype.a=null;var ab=function(a){var b;(b=a.a)||(b={},$a(a)&&(b[0]=!0,b[1]=!0),b=a.a=b);return b};var bb=Array.prototype.indexOf?function(a,b,c){C(null!=a.length);return Array.prototype.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(q(a))return q(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},cb=Array.prototype.forEach?function(a,b,c){C(null!=a.length);Array.prototype.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},db=Array.prototype.filter?function(a,
b,c){C(null!=a.length);return Array.prototype.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=q(a)?a.split(""):a,h=0;h<d;h++)if(h in g){var l=g[h];b.call(c,l,h,a)&&(e[f++]=l)}return e},eb=Array.prototype.map?function(a,b,c){C(null!=a.length);return Array.prototype.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=q(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e},fb=Array.prototype.some?function(a,b,c){C(null!=a.length);return Array.prototype.some.call(a,
b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1},hb=function(a){var b;a:{b=gb;for(var c=a.length,d=q(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:q(a)?a.charAt(b):a[b]},ib=function(a){if("array"!=p(a))for(var b=a.length-1;0<=b;b--)delete a[b];a.length=0},jb=function(a,b){b=bb(a,b);var c;if(c=0<=b)C(null!=a.length),Array.prototype.splice.call(a,b,1);return c},kb=function(a){var b=
a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]};var mb=new va(function(){return new lb},function(a){a.reset()},100),ob=function(){var a=nb,b=null;a.a&&(b=a.a,a.a=a.a.next,a.a||(a.b=null),b.next=null);return b},lb=function(){this.next=this.b=this.a=null};lb.prototype.set=function(a,b){this.a=a;this.b=b;this.next=null};lb.prototype.reset=function(){this.next=this.b=this.a=null};var pb=function(a,b){this.type=a;this.a=this.target=b;this.la=!0};pb.prototype.b=function(){this.la=!1};var qb=function(a,b,c,d,e){this.listener=a;this.a=null;this.src=b;this.type=c;this.W=!!d;this.N=e;++Ua;this.O=this.V=!1},rb=function(a){a.O=!0;a.listener=null;a.a=null;a.src=null;a.N=null};var sb=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;var tb=function(a,b){b=db(b.split("/"),function(a){return 0<a.length}).join("/");return 0===a.length?b:a+"/"+b},ub=function(a){var b=a.lastIndexOf("/",a.length-2);return-1===b?a:a.slice(b+1)};var vb=function(a){this.src=a;this.a={};this.b=0},xb=function(a,b,c,d,e,f){var g=b.toString();b=a.a[g];b||(b=a.a[g]=[],a.b++);var h=wb(b,c,e,f);-1<h?(a=b[h],d||(a.V=!1)):(a=new qb(c,a.src,g,!!e,f),a.V=d,b.push(a));return a},yb=function(a,b){var c=b.type;c in a.a&&jb(a.a[c],b)&&(rb(b),0==a.a[c].length&&(delete a.a[c],a.b--))},wb=function(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.O&&f.listener==b&&f.W==!!c&&f.N==d)return e}return-1};var zb,Ab=function(){};u(Ab,Za);var Bb=function(a){return(a=$a(a))?new ActiveXObject(a):new XMLHttpRequest},$a=function(a){if(!a.b&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.b=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.b};zb=new Ab;var Cb=function(a){this.a=[];if(a)a:{var b;if(a instanceof Cb){if(b=a.H(),a=a.w(),0>=this.o()){for(var c=this.a,d=0;d<b.length;d++)c.push(new Ka(b[d],a[d]));break a}}else b=Ba(a),a=Aa(a);for(d=0;d<b.length;d++)Db(this,b[d],a[d])}},Db=function(a,b,c){var d=a.a;d.push(new Ka(b,c));b=d.length-1;a=a.a;for(c=a[b];0<b;)if(d=b-1>>1,a[d].a>c.a)a[b]=a[d],b=d;else break;a[b]=c};k=Cb.prototype;k.w=function(){for(var a=this.a,b=[],c=a.length,d=0;d<c;d++)b.push(a[d].b);return b};
k.H=function(){for(var a=this.a,b=[],c=a.length,d=0;d<c;d++)b.push(a[d].a);return b};k.clone=function(){return new Cb(this)};k.o=function(){return this.a.length};k.I=function(){return 0==this.a.length};k.clear=function(){ib(this.a)};var Eb=function(){this.b=[];this.a=[]},Fb=function(a){0==a.b.length&&(a.b=a.a,a.b.reverse(),a.a=[]);return a.b.pop()};Eb.prototype.o=function(){return this.b.length+this.a.length};Eb.prototype.I=function(){return 0==this.b.length&&0==this.a.length};Eb.prototype.clear=function(){this.b=[];this.a=[]};Eb.prototype.w=function(){for(var a=[],b=this.b.length-1;0<=b;--b)a.push(this.b[b]);for(var c=this.a.length,b=0;b<c;++b)a.push(this.a[b]);return a};var Gb=function(a){if(a.w&&"function"==typeof a.w)return a.w();if(q(a))return a.split("");if(ca(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Aa(a)},Hb=function(a,b){if(a.forEach&&"function"==typeof a.forEach)a.forEach(b,void 0);else if(ca(a)||q(a))cb(a,b,void 0);else{var c;if(a.H&&"function"==typeof a.H)c=a.H();else if(a.w&&"function"==typeof a.w)c=void 0;else if(ca(a)||q(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=Ba(a);for(var d=Gb(a),e=d.length,f=0;f<e;f++)b.call(void 0,
d[f],c&&c[f],a)}};var Ib=function(a){m.setTimeout(function(){throw a;},0)},Jb,Kb=function(){var a=m.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&!E("Presto")&&(a=function(){var a=document.createElement("IFRAME");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+"//"+b.location.host,
a=t(function(a){if(("*"==d||a.origin==d)&&a.data==c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&!E("Trident")&&!E("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(n(c.next)){c=c.next;var a=c.fa;c.fa=null;a()}};return function(a){d.next={fa:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("SCRIPT")?
function(a){var b=document.createElement("SCRIPT");b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){m.setTimeout(a,0)}};var Lb="StopIteration"in m?m.StopIteration:{message:"StopIteration",stack:""},Mb=function(){};Mb.prototype.next=function(){throw Lb;};Mb.prototype.aa=function(){return this};var Nb=function(){Cb.call(this)};u(Nb,Cb);var Ob=E("Opera"),F=E("Trident")||E("MSIE"),Pb=E("Edge"),Qb=E("Gecko")&&!(-1!=Wa.toLowerCase().indexOf("webkit")&&!E("Edge"))&&!(E("Trident")||E("MSIE"))&&!E("Edge"),Rb=-1!=Wa.toLowerCase().indexOf("webkit")&&!E("Edge"),Sb=function(){var a=m.document;return a?a.documentMode:void 0},Tb;
a:{var Vb="",Wb=function(){var a=Wa;if(Qb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(Pb)return/Edge\/([\d\.]+)/.exec(a);if(F)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(Rb)return/WebKit\/(\S+)/.exec(a);if(Ob)return/(?:Version)[ \/]?(\S+)/.exec(a)}();Wb&&(Vb=Wb?Wb[1]:"");if(F){var Xb=Sb();if(null!=Xb&&Xb>parseFloat(Vb)){Tb=String(Xb);break a}}Tb=Vb}
var Yb=Tb,Zb={},G=function(a){var b;if(!(b=Zb[a])){b=0;for(var c=Ia(String(Yb)).split("."),d=Ia(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",h=d[f]||"",l=/(\d*)(\D*)/g,B=/(\d*)(\D*)/g;do{var x=l.exec(g)||["","",""],N=B.exec(h)||["","",""];if(0==x[0].length&&0==N[0].length)break;b=Ja(0==x[1].length?0:parseInt(x[1],10),0==N[1].length?0:parseInt(N[1],10))||Ja(0==x[2].length,0==N[2].length)||Ja(x[2],N[2])}while(0==b)}b=Zb[a]=0<=b}return b},$b=m.document,ac=$b&&
F?Sb()||("CSS1Compat"==$b.compatMode?parseInt(Yb,10):5):void 0;var ec=function(a,b){bc||cc();dc||(bc(),dc=!0);var c=nb,d=mb.get();d.set(a,b);c.b?c.b.next=d:(C(!c.a),c.a=d);c.b=d},bc,cc=function(){if(m.Promise&&m.Promise.resolve){var a=m.Promise.resolve(void 0);bc=function(){a.then(fc)}}else bc=function(){var a=fc;!r(m.setImmediate)||m.Window&&m.Window.prototype&&!E("Edge")&&m.Window.prototype.setImmediate==m.setImmediate?(Jb||(Jb=Kb()),Jb(a)):m.setImmediate(a)}},dc=!1,nb=new function(){this.b=this.a=null},fc=function(){for(var a;a=ob();){try{a.a.call(a.b)}catch(b){Ib(b)}wa(mb,
a)}dc=!1};var gc;(gc=!F)||(gc=9<=Number(ac));var hc=gc,ic=F&&!G("9");!Rb||G("528");Qb&&G("1.9b")||F&&G("8")||Ob&&G("9.5")||Rb&&G("528");Qb&&!G("8")||F&&G("9");var jc=function(a,b){this.b={};this.a=[];this.f=this.c=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else if(a){a instanceof jc?(c=a.H(),d=a.w()):(c=Ba(a),d=Aa(a));for(var e=0;e<c.length;e++)this.set(c[e],d[e])}};k=jc.prototype;k.o=function(){return this.c};k.w=function(){kc(this);for(var a=[],b=0;b<this.a.length;b++)a.push(this.b[this.a[b]]);return a};k.H=function(){kc(this);return this.a.concat()};
k.I=function(){return 0==this.c};k.clear=function(){this.b={};this.f=this.c=this.a.length=0};
var lc=function(a,b){return Object.prototype.hasOwnProperty.call(a.b,b)?(delete a.b[b],a.c--,a.f++,a.a.length>2*a.c&&kc(a),!0):!1},kc=function(a){if(a.c!=a.a.length){for(var b=0,c=0;b<a.a.length;){var d=a.a[b];Object.prototype.hasOwnProperty.call(a.b,d)&&(a.a[c++]=d);b++}a.a.length=c}if(a.c!=a.a.length){for(var e={},c=b=0;b<a.a.length;)d=a.a[b],Object.prototype.hasOwnProperty.call(e,d)||(a.a[c++]=d,e[d]=1),b++;a.a.length=c}};k=jc.prototype;
k.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.b,a)?this.b[a]:b};k.set=function(a,b){Object.prototype.hasOwnProperty.call(this.b,a)||(this.c++,this.a.push(a),this.f++);this.b[a]=b};k.forEach=function(a,b){for(var c=this.H(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};k.clone=function(){return new jc(this)};
k.aa=function(a){kc(this);var b=0,c=this.f,d=this,e=new Mb;e.next=function(){if(c!=d.f)throw Error("The map has changed since the iterator was created");if(b>=d.a.length)throw Lb;var e=d.a[b++];return a?e:d.b[e]};return e};var mc=function(a,b){pb.call(this,a?a.type:"");this.c=this.a=this.target=null;if(a){this.type=a.type;this.target=a.target||a.srcElement;this.a=b;if((b=a.relatedTarget)&&Qb)try{Ga(b.nodeName)}catch(c){}this.c=a;a.defaultPrevented&&this.b()}};u(mc,pb);mc.prototype.b=function(){mc.J.b.call(this);var a=this.c;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,ic)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var H=function(a,b){this.a=0;this.i=void 0;this.c=this.b=this.f=null;this.g=this.h=!1;if(a!=ba)try{var c=this;a.call(b,function(a){nc(c,2,a)},function(a){try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}nc(c,3,a)})}catch(d){nc(this,3,d)}},oc=function(){this.next=this.f=this.c=this.a=this.b=null;this.g=!1};oc.prototype.reset=function(){this.f=this.c=this.a=this.b=null;this.g=!1};
var pc=new va(function(){return new oc},function(a){a.reset()},100),qc=function(a,b,c){var d=pc.get();d.a=a;d.c=b;d.f=c;return d},rc=function(a){if(a instanceof H)return a;var b=new H(ba);nc(b,2,a);return b},sc=function(a){return new H(function(b,c){c(a)})};
H.prototype.then=function(a,b,c){null!=a&&Sa(a,"opt_onFulfilled should be a function.");null!=b&&Sa(b,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?");return tc(this,r(a)?a:null,r(b)?b:null,c)};Ea(H);H.prototype.l=function(a,b){return tc(this,null,a,b)};
var vc=function(a,b){a.b||2!=a.a&&3!=a.a||uc(a);C(null!=b.a);a.c?a.c.next=b:a.b=b;a.c=b},tc=function(a,b,c,d){var e=qc(null,null,null);e.b=new H(function(a,g){e.a=b?function(c){try{var e=b.call(d,c);a(e)}catch(B){g(B)}}:a;e.c=c?function(b){try{var e=c.call(d,b);a(e)}catch(B){g(B)}}:g});e.b.f=a;vc(a,e);return e.b};H.prototype.s=function(a){C(1==this.a);this.a=0;nc(this,2,a)};H.prototype.m=function(a){C(1==this.a);this.a=0;nc(this,3,a)};
var nc=function(a,b,c){if(0==a.a){a===c&&(b=3,c=new TypeError("Promise cannot resolve to itself"));a.a=1;var d;a:{var e=c,f=a.s,g=a.m;if(e instanceof H)null!=f&&Sa(f,"opt_onFulfilled should be a function."),null!=g&&Sa(g,"opt_onRejected should be a function. Did you pass opt_context as the second argument instead of the third?"),vc(e,qc(f||ba,g||null,a)),d=!0;else if(Fa(e))e.then(f,g,a),d=!0;else{if(da(e))try{var h=e.then;if(r(h)){wc(e,h,f,g,a);d=!0;break a}}catch(l){g.call(a,l);d=!0;break a}d=!1}}d||
(a.i=c,a.a=b,a.f=null,uc(a),3!=b||xc(a,c))}},wc=function(a,b,c,d,e){var f=!1,g=function(a){f||(f=!0,c.call(e,a))},h=function(a){f||(f=!0,d.call(e,a))};try{b.call(a,g,h)}catch(l){h(l)}},uc=function(a){a.h||(a.h=!0,ec(a.j,a))},yc=function(a){var b=null;a.b&&(b=a.b,a.b=b.next,b.next=null);a.b||(a.c=null);null!=b&&C(null!=b.a);return b};
H.prototype.j=function(){for(var a;a=yc(this);){var b=this.a,c=this.i;if(3==b&&a.c&&!a.g){var d;for(d=this;d&&d.g;d=d.f)d.g=!1}if(a.b)a.b.f=null,zc(a,b,c);else try{a.g?a.a.call(a.f):zc(a,b,c)}catch(e){Ac.call(null,e)}wa(pc,a)}this.h=!1};var zc=function(a,b,c){2==b?a.a.call(a.f,c):a.c&&a.c.call(a.f,c)},xc=function(a,b){a.g=!0;ec(function(){a.g&&Ac.call(null,b)})},Ac=Ib;var Cc=function(a){this.a=new jc;if(a){a=Gb(a);for(var b=a.length,c=0;c<b;c++){var d=a[c];this.a.set(Bc(d),d)}}},Bc=function(a){var b=typeof a;return"object"==b&&a||"function"==b?"o"+(a[ea]||(a[ea]=++fa)):b.substr(0,1)+a};k=Cc.prototype;k.o=function(){return this.a.o()};k.clear=function(){this.a.clear()};k.I=function(){return this.a.I()};k.w=function(){return this.a.w()};k.clone=function(){return new Cc(this)};k.aa=function(){return this.a.aa(!1)};var Dc=function(a){return function(){var b=[];Array.prototype.push.apply(b,arguments);rc(!0).then(function(){a.apply(null,b)})}};var Ec="closure_lm_"+(1E6*Math.random()|0),Fc={},Gc=0,Hc=function(a,b,c,d,e){if("array"==p(b)){for(var f=0;f<b.length;f++)Hc(a,b[f],c,d,e);return null}c=Ic(c);a&&a[Ta]?(Jc(a),a=xb(a.b,String(b),c,!1,d,e)):a=Kc(a,b,c,!1,d,e);return a},Kc=function(a,b,c,d,e,f){if(!b)throw Error("Invalid event type");var g=!!e,h=Lc(a);h||(a[Ec]=h=new vb(a));c=xb(h,b,c,d,e,f);if(c.a)return c;d=Mc();c.a=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,g);else if(a.attachEvent)a.attachEvent(Nc(b.toString()),
d);else throw Error("addEventListener and attachEvent are unavailable.");Gc++;return c},Mc=function(){var a=Oc,b=hc?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b},Pc=function(a,b,c,d,e){if("array"==p(b))for(var f=0;f<b.length;f++)Pc(a,b[f],c,d,e);else c=Ic(c),a&&a[Ta]?xb(a.b,String(b),c,!0,d,e):Kc(a,b,c,!0,d,e)},Qc=function(a,b,c,d,e){if("array"==p(b))for(var f=0;f<b.length;f++)Qc(a,b[f],c,d,e);else(c=Ic(c),a&&a[Ta])?(a=a.b,b=String(b).toString(),
b in a.a&&(f=a.a[b],c=wb(f,c,d,e),-1<c&&(rb(f[c]),C(null!=f.length),Array.prototype.splice.call(f,c,1),0==f.length&&(delete a.a[b],a.b--)))):a&&(a=Lc(a))&&(b=a.a[b.toString()],a=-1,b&&(a=wb(b,c,!!d,e)),(c=-1<a?b[a]:null)&&Rc(c))},Rc=function(a){if("number"!=typeof a&&a&&!a.O){var b=a.src;if(b&&b[Ta])yb(b.b,a);else{var c=a.type,d=a.a;b.removeEventListener?b.removeEventListener(c,d,a.W):b.detachEvent&&b.detachEvent(Nc(c),d);Gc--;(c=Lc(b))?(yb(c,a),0==c.b&&(c.src=null,b[Ec]=null)):rb(a)}}},Nc=function(a){return a in
Fc?Fc[a]:Fc[a]="on"+a},Tc=function(a,b,c,d){var e=!0;if(a=Lc(a))if(b=a.a[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.W==c&&!f.O&&(f=Sc(f,d),e=e&&!1!==f)}return e},Sc=function(a,b){var c=a.listener,d=a.N||a.src;a.V&&Rc(a);return c.call(d,b)},Oc=function(a,b){if(a.O)return!0;if(!hc){if(!b)a:{b=["window","event"];for(var c=m,d;d=b.shift();)if(null!=c[d])c=c[d];else{b=null;break a}b=c}d=b;b=new mc(d,this);c=!0;if(!(0>d.keyCode||void 0!=d.returnValue)){a:{var e=!1;if(0==d.keyCode)try{d.keyCode=
-1;break a}catch(g){e=!0}if(e||void 0==d.returnValue)d.returnValue=!0}d=[];for(e=b.a;e;e=e.parentNode)d.push(e);a=a.type;for(e=d.length-1;0<=e;e--){b.a=d[e];var f=Tc(d[e],a,!0,b),c=c&&f}for(e=0;e<d.length;e++)b.a=d[e],f=Tc(d[e],a,!1,b),c=c&&f}return c}return Sc(a,new mc(b,this))},Lc=function(a){a=a[Ec];return a instanceof vb?a:null},Uc="__closure_events_fn_"+(1E9*Math.random()>>>0),Ic=function(a){C(a,"Listener can not be null.");if(r(a))return a;C(a.handleEvent,"An object listener must have handleEvent method.");
a[Uc]||(a[Uc]=function(b){return a.handleEvent(b)});return a[Uc]};var I=function(a,b){D.call(this);this.l=a||0;this.c=b||10;if(this.l>this.c)throw Error("[goog.structs.Pool] Min can not be greater than max");this.a=new Eb;this.b=new Cc;this.i=null;this.U()};u(I,D);I.prototype.Y=function(){var a=ia();if(!(null!=this.i&&0>a-this.i)){for(var b;0<this.a.o()&&(b=Fb(this.a),!this.j(b));)this.U();!b&&this.o()<this.c&&(b=this.h());b&&(this.i=a,this.b.a.set(Bc(b),b));return b}};var Wc=function(a){var b=Vc;lc(b.b.a,Bc(a))&&b.ba(a)};
I.prototype.ba=function(a){lc(this.b.a,Bc(a));this.j(a)&&this.o()<this.c?this.a.a.push(a):Xc(a)};I.prototype.U=function(){for(var a=this.a;this.o()<this.l;){var b=this.h();a.a.push(b)}for(;this.o()>this.c&&0<this.a.o();)Xc(Fb(a))};I.prototype.h=function(){return{}};var Xc=function(a){if("function"==typeof a.ga)a.ga();else for(var b in a)a[b]=null};I.prototype.j=function(a){return"function"==typeof a.ra?a.ra():!0};I.prototype.o=function(){return this.a.o()+this.b.o()};
I.prototype.I=function(){return this.a.I()&&this.b.I()};I.prototype.C=function(){I.J.C.call(this);if(0<this.b.o())throw Error("[goog.structs.Pool] Objects not released");delete this.b;for(var a=this.a;!a.I();)Xc(Fb(a));delete this.a};/*
 Portions of this code are from MochiKit, received by
 The Closure Authors under the MIT license. All other code is Copyright
 2005-2009 The Closure Authors. All Rights Reserved.
*/
var Yc=function(a,b){this.c=[];this.m=b||null;this.a=this.h=!1;this.b=void 0;this.j=this.g=!1;this.f=0;this.i=null;this.s=0};Yc.prototype.l=function(a,b){this.g=!1;this.h=!0;this.b=b;this.a=!a;Zc(this)};var $c=function(a,b,c){C(!a.j,"Blocking Deferreds can not be re-used");a.c.push([b,c,void 0]);a.h&&Zc(a)};Yc.prototype.then=function(a,b,c){var d,e,f=new H(function(a,b){d=a;e=b});$c(this,d,function(a){e(a)});return f.then(a,b,c)};Ea(Yc);
var ad=function(a){return fb(a.c,function(a){return r(a[1])})},Zc=function(a){if(a.f&&a.h&&ad(a)){var b=a.f,c=bd[b];c&&(m.clearTimeout(c.a),delete bd[b]);a.f=0}a.i&&(a.i.s--,delete a.i);for(var b=a.b,d=c=!1;a.c.length&&!a.g;){var e=a.c.shift(),f=e[0],g=e[1],e=e[2];if(f=a.a?g:f)try{var h=f.call(e||a.m,b);n(h)&&(a.a=a.a&&(h==b||h instanceof Error),a.b=b=h);if(Fa(b)||"function"===typeof m.Promise&&b instanceof m.Promise)d=!0,a.g=!0}catch(l){b=l,a.a=!0,ad(a)||(c=!0)}}a.b=b;d&&(h=t(a.l,a,!0),d=t(a.l,a,
!1),b instanceof Yc?($c(b,h,d),b.j=!0):b.then(h,d));c&&(b=new cd(b),bd[b.a]=b,a.f=b.a)},cd=function(a){this.a=m.setTimeout(t(this.c,this),0);this.b=a};cd.prototype.c=function(){C(bd[this.a],"Cannot throw an error that is not scheduled.");delete bd[this.a];throw this.b;};var bd={};var dd=function(a){this.f=a;this.b=this.c=this.a=null},ed=function(a,b){this.name=a;this.value=b};ed.prototype.toString=function(){return this.name};var fd=new ed("SEVERE",1E3),gd=new ed("CONFIG",700),hd=new ed("FINE",500),id=function(a){if(a.c)return a.c;if(a.a)return id(a.a);Ra("Root logger has no level set.");return null};
dd.prototype.log=function(a,b,c){if(a.value>=id(this).value)for(r(b)&&(b=b()),a=new ya(a,String(b),this.f),c&&(a.a=c),c="log:"+a.b,m.console&&(m.console.timeStamp?m.console.timeStamp(c):m.console.markTimeline&&m.console.markTimeline(c)),m.msWriteProfilerMark&&m.msWriteProfilerMark(c),c=this;c;)c=c.a};
var jd={},kd=null,ld=function(a){kd||(kd=new dd(""),jd[""]=kd,kd.c=gd);var b;if(!(b=jd[a])){b=new dd(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=ld(a.substr(0,c));c.b||(c.b={});c.b[d]=b;b.a=c;jd[a]=b}return b};var J=function(){D.call(this);this.b=new vb(this);this.$=this;this.G=null};u(J,D);J.prototype[Ta]=!0;J.prototype.removeEventListener=function(a,b,c,d){Qc(this,a,b,c,d)};
var K=function(a,b){Jc(a);var c,d=a.G;if(d){c=[];for(var e=1;d;d=d.G)c.push(d),C(1E3>++e,"infinite loop")}a=a.$;d=b.type||b;q(b)?b=new pb(b,a):b instanceof pb?b.target=b.target||a:(e=b,b=new pb(d,a),Da(b,e));var e=!0,f;if(c)for(var g=c.length-1;0<=g;g--)f=b.a=c[g],e=md(f,d,!0,b)&&e;f=b.a=a;e=md(f,d,!0,b)&&e;e=md(f,d,!1,b)&&e;if(c)for(g=0;g<c.length;g++)f=b.a=c[g],e=md(f,d,!1,b)&&e};
J.prototype.C=function(){J.J.C.call(this);if(this.b){var a=this.b,b=0,c;for(c in a.a){for(var d=a.a[c],e=0;e<d.length;e++)++b,rb(d[e]);delete a.a[c];a.b--}}this.G=null};var md=function(a,b,c,d){b=a.b.a[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var g=b[f];if(g&&!g.O&&g.W==c){var h=g.listener,l=g.N||g.src;g.V&&yb(a.b,g);e=!1!==h.call(l,d)&&e}}return e&&0!=d.la},Jc=function(a){C(a.b,"Event target is not initialized. Did you call the superclass (goog.events.EventTarget) constructor?")};var L=function(a,b){this.f=new Nb;I.call(this,a,b)};u(L,I);k=L.prototype;k.Y=function(a,b){if(!a)return L.J.Y.call(this);Db(this.f,n(b)?b:100,a);this.ca()};k.ca=function(){for(var a=this.f;0<a.o();){var b=this.Y();if(b){var c;var d=a,e=d.a,f=e.length;c=e[0];if(0>=f)c=void 0;else{if(1==f)ib(e);else{e[0]=e.pop();for(var e=0,d=d.a,f=d.length,g=d[e];e<f>>1;){var h=2*e+1,l=2*e+2,h=l<f&&d[l].a<d[h].a?l:h;if(d[h].a>g.a)break;d[e]=d[h];e=h}d[e]=g}c=c.b}c.apply(this,[b])}else break}};
k.ba=function(a){L.J.ba.call(this,a);this.ca()};k.U=function(){L.J.U.call(this);this.ca()};k.C=function(){L.J.C.call(this);m.clearTimeout(void 0);this.f.clear();this.f=null};var M=function(a,b){a&&a.log(hd,b,void 0)};var nd=function(a,b,c){if(r(a))c&&(a=t(a,c));else if(a&&"function"==typeof a.handleEvent)a=t(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(b)?-1:m.setTimeout(a,b||0)};var O=function(a){J.call(this);this.L=new jc;this.B=a||null;this.c=!1;this.A=this.a=null;this.P=this.l="";this.K=0;this.h="";this.f=this.F=this.j=this.D=!1;this.i=0;this.m=null;this.T="";this.u=this.ea=this.Z=!1};u(O,J);var od=O.prototype,pd=ld("goog.net.XhrIo");od.v=pd;var qd=/^https?$/i,rd=["POST","PUT"];
O.prototype.send=function(a,b,c,d){if(this.a)throw Error("[goog.net.XhrIo] Object is active with another request="+this.l+"; newUri="+a);b=b?b.toUpperCase():"GET";this.l=a;this.h="";this.K=0;this.P=b;this.D=!1;this.c=!0;this.a=this.B?Bb(this.B):Bb(zb);this.A=this.B?ab(this.B):ab(zb);this.a.onreadystatechange=t(this.S,this);this.ea&&"onprogress"in this.a&&(this.a.onprogress=t(function(a){this.R(a,!0)},this),this.a.upload&&(this.a.upload.onprogress=t(this.R,this)));try{M(this.v,P(this,"Opening Xhr")),
this.F=!0,this.a.open(b,String(a),!0),this.F=!1}catch(f){M(this.v,P(this,"Error opening Xhr: "+f.message));sd(this,f);return}a=c||"";var e=this.L.clone();d&&Hb(d,function(a,b){e.set(b,a)});d=hb(e.H());c=m.FormData&&a instanceof m.FormData;!(0<=bb(rd,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");e.forEach(function(a,b){this.a.setRequestHeader(b,a)},this);this.T&&(this.a.responseType=this.T);"withCredentials"in this.a&&this.a.withCredentials!==this.Z&&(this.a.withCredentials=
this.Z);try{td(this),0<this.i&&(this.u=ud(this.a),M(this.v,P(this,"Will abort after "+this.i+"ms if incomplete, xhr2 "+this.u)),this.u?(this.a.timeout=this.i,this.a.ontimeout=t(this.M,this)):this.m=nd(this.M,this.i,this)),M(this.v,P(this,"Sending request")),this.j=!0,this.a.send(a),this.j=!1}catch(f){M(this.v,P(this,"Send error: "+f.message)),sd(this,f)}};var ud=function(a){return F&&G(9)&&"number"==typeof a.timeout&&n(a.ontimeout)},gb=function(a){return"content-type"==a.toLowerCase()};
O.prototype.M=function(){"undefined"!=typeof aa&&this.a&&(this.h="Timed out after "+this.i+"ms, aborting",this.K=8,M(this.v,P(this,this.h)),K(this,"timeout"),vd(this,8))};var sd=function(a,b){a.c=!1;a.a&&(a.f=!0,a.a.abort(),a.f=!1);a.h=b;a.K=5;wd(a);xd(a)},wd=function(a){a.D||(a.D=!0,K(a,"complete"),K(a,"error"))},vd=function(a,b){a.a&&a.c&&(M(a.v,P(a,"Aborting")),a.c=!1,a.f=!0,a.a.abort(),a.f=!1,a.K=b||7,K(a,"complete"),K(a,"abort"),xd(a))};
O.prototype.C=function(){this.a&&(this.c&&(this.c=!1,this.f=!0,this.a.abort(),this.f=!1),xd(this,!0));O.J.C.call(this)};O.prototype.S=function(){this.g||(this.F||this.j||this.f?yd(this):this.na())};O.prototype.na=function(){yd(this)};
var yd=function(a){if(a.c&&"undefined"!=typeof aa)if(a.A[1]&&4==zd(a)&&2==Q(a))M(a.v,P(a,"Local request error detected and ignored"));else if(a.j&&4==zd(a))nd(a.S,0,a);else if(K(a,"readystatechange"),4==zd(a)){M(a.v,P(a,"Request complete"));a.c=!1;try{if(Bd(a))K(a,"complete"),K(a,"success");else{a.K=6;var b;try{b=2<zd(a)?a.a.statusText:""}catch(c){M(a.v,"Can not get status: "+c.message),b=""}a.h=b+" ["+Q(a)+"]";wd(a)}}finally{xd(a)}}};
O.prototype.R=function(a,b){C("progress"===a.type,"goog.net.EventType.PROGRESS is of the same type as raw XHR progress.");K(this,Cd(a,"progress"));K(this,Cd(a,b?"downloadprogress":"uploadprogress"))};
var Cd=function(a,b){return{type:b,lengthComputable:a.lengthComputable,loaded:a.loaded,total:a.total}},xd=function(a,b){if(a.a){td(a);var c=a.a,d=a.A[0]?ba:null;a.a=null;a.A=null;b||K(a,"ready");try{c.onreadystatechange=d}catch(e){(a=a.v)&&a.log(fd,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}},td=function(a){a.a&&a.u&&(a.a.ontimeout=null);"number"==typeof a.m&&(m.clearTimeout(a.m),a.m=null)},Bd=function(a){var b=Q(a),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=
!0;break a;default:c=!1}if(!c){if(b=0===b)a=String(a.l).match(sb)[1]||null,!a&&m.self&&m.self.location&&(a=m.self.location.protocol,a=a.substr(0,a.length-1)),b=!qd.test(a?a.toLowerCase():"");c=b}return c},zd=function(a){return a.a?a.a.readyState:0},Q=function(a){try{return 2<zd(a)?a.a.status:-1}catch(b){return-1}},Dd=function(a){try{return a.a?a.a.responseText:""}catch(b){return M(a.v,"Can not get responseText: "+b.message),""}},Ed=function(a,b){return a.a&&4==zd(a)?a.a.getResponseHeader(b):void 0},
P=function(a,b){return b+" ["+a.P+" "+a.l+" "+Q(a)+"]"};var Fd=function(a,b,c,d){this.m=a;this.u=!!d;L.call(this,b,c)};u(Fd,L);Fd.prototype.h=function(){var a=new O,b=this.m;b&&b.forEach(function(b,d){a.L.set(d,b)});this.u&&(a.Z=!0);return a};Fd.prototype.j=function(a){return!a.g&&!a.a};var Vc=new Fd;var Hd=function(a,b,c,d,e,f,g,h,l,B){this.L=a;this.F=b;this.A=c;this.m=d;this.G=e.slice();this.l=this.s=this.f=this.c=null;this.h=this.i=!1;this.u=f;this.j=g;this.g=l;this.M=B;this.D=h;var x=this;this.B=new H(function(a,b){x.s=a;x.l=b;Gd(x)})},Id=function(a,b,c){this.b=a;this.c=b;this.a=!!c},Gd=function(a){function b(a,b){b?a(!1,new Id(!1,null,!0)):Vc.Y(function(b){b.Z=d.M;d.c=b;var c=null;null!==d.g&&(b.ea=!0,c=Hc(b,"uploadprogress",function(a){d.g(a.loaded,a.lengthComputable?a.total:-1)}),b.ea=
null!==d.g);b.send(d.L,d.F,d.m,d.A);Pc(b,"complete",function(b){null!==c&&Rc(c);d.c=null;b=b.target;var f=6===b.K&&100<=Q(b),f=Bd(b)||f,g=Q(b);!f||500<=g&&600>g||429===g?(f=7===b.K,Wc(b),a(!1,new Id(!1,null,f))):(f=0<=bb(d.G,g),a(!0,new Id(f,b)))})})}function c(a,b){var c=d.s;a=d.l;var h=b.c;if(b.b)try{var l=d.u(h,Dd(h));n(l)?c(l):c()}catch(B){a(B)}else null!==h?(b=la(),l=Dd(h),b.serverResponse=l,d.j?a(d.j(h,b)):a(b)):(b=b.a?d.h?oa():ma():new v("retry-limit-exceeded","Max retry time for operation exceeded, please try again."),
a(b));Wc(h)}var d=a;a.i?c(0,new Id(!1,null,!0)):a.f=ja(b,c,a.D)};Hd.prototype.a=function(){return this.B};Hd.prototype.b=function(a){this.i=!0;this.h=a||!1;null!==this.f&&(0,this.f)(!1);null!==this.c&&vd(this.c)};var Jd=function(a,b,c){var d=Oa(a.f),d=a.l+d,e=a.b?qa(a.b):{};null!==b&&0<b.length&&(e.Authorization="Firebase "+b);e["X-Firebase-Storage-Version"]="webjs/"+("undefined"!==typeof firebase?firebase.SDK_VERSION:"AppManager");return new Hd(d,a.i,e,a.c,a.h,a.N,a.a,a.j,a.g,c)};var Kd=function(a){var b=m.BlobBuilder||m.WebKitBlobBuilder;if(n(b)){for(var b=new b,c=0;c<arguments.length;c++)b.append(arguments[c]);return b.getBlob()}b=kb(arguments);c=m.BlobBuilder||m.WebKitBlobBuilder;if(n(c)){for(var c=new c,d=0;d<b.length;d++)c.append(b[d],void 0);b=c.getBlob(void 0)}else if(n(m.Blob))b=new Blob(b,{});else throw Error("This browser doesn't seem to support creating Blobs");return b},Ld=function(a,b,c){n(c)||(c=a.size);return a.webkitSlice?a.webkitSlice(b,c):a.mozSlice?a.mozSlice(b,
c):a.slice?Qb&&!G("13.0")||Rb&&!G("537.1")?(0>b&&(b+=a.size),0>b&&(b=0),0>c&&(c+=a.size),c<b&&(c=b),a.slice(b,c-b)):a.slice(b,c):null};var Md=function(a){this.c=sc(a)};Md.prototype.a=function(){return this.c};Md.prototype.b=function(){};var Nd=function(){this.a={};this.b=Number.MIN_SAFE_INTEGER},Od=function(a,b){function c(){delete e.a[d]}var d=a.b;a.b++;a.a[d]=b;var e=a;b.a().then(c,c)};Nd.prototype.clear=function(){pa(this.a,function(a,b){b&&b.b(!0)});this.a={}};var Pd=function(a,b,c,d){this.a=a;this.g=null;if(null!==this.a&&(a=this.a.options,y(a))){a=a.storageBucket||null;if(null==a)a=null;else{var e=null;try{e=Ma(a)}catch(f){}if(null!==e){if(""!==e.path)throw new v("invalid-default-bucket","Invalid default bucket '"+a+"'.");a=e.bucket}}this.g=a}this.l=b;this.j=c;this.i=d;this.c=12E4;this.b=6E4;this.h=new Nd;this.f=!1},Qd=function(a){return null!==a.a&&y(a.a.INTERNAL)&&y(a.a.INTERNAL.getToken)?a.a.INTERNAL.getToken().then(function(a){return y(a)?a.accessToken:
null},function(){return null}):rc(null)};Pd.prototype.bucket=function(){if(this.f)throw oa();return this.g};var R=function(a,b,c){if(a.f)return new Md(oa());b=a.j(b,c,null===a.a);Od(a.h,b);return b};var Rd=function(a,b){return b},S=function(a,b,c,d){this.c=a;this.b=b||a;this.f=!!c;this.a=d||Rd},Sd=null,Td=function(){if(Sd)return Sd;var a=[];a.push(new S("bucket"));a.push(new S("generation"));a.push(new S("metageneration"));a.push(new S("name","fullPath",!0));var b=new S("name");b.a=function(a,b){return!ua(b)||2>b.length?b:ub(b)};a.push(b);b=new S("size");b.a=function(a,b){return y(b)?+b:b};a.push(b);a.push(new S("timeCreated"));a.push(new S("updated"));a.push(new S("md5Hash",null,!0));a.push(new S("cacheControl",
null,!0));a.push(new S("contentDisposition",null,!0));a.push(new S("contentEncoding",null,!0));a.push(new S("contentLanguage",null,!0));a.push(new S("contentType",null,!0));a.push(new S("metadata","customMetadata",!0));a.push(new S("downloadTokens","downloadURLs",!1,function(a,b){if(!(ua(b)&&0<b.length))return[];var e=encodeURIComponent;return eb(b.split(","),function(b){var d=a.fullPath,d="https://firebasestorage.googleapis.com/v0"+("/b/"+e(a.bucket)+"/o/"+e(d));b=Oa({alt:"media",token:b});return d+
b})}));return Sd=a},Ud=function(a,b){Object.defineProperty(a,"ref",{get:function(){return b.l(b,new z(a.bucket,a.fullPath))}})},Vd=function(a,b){for(var c={},d=b.length,e=0;e<d;e++){var f=b[e];f.f&&(c[f.c]=a[f.b])}return JSON.stringify(c)},Wd=function(a){if(!a||"object"!==typeof a)throw"Expected Metadata object.";for(var b in a){var c=a[b];if("customMetadata"===b&&"object"!==typeof c)throw"Expected object for 'customMetadata' mapping.";}};var T=function(a,b,c){for(var d=b.length,e=b.length,f=0;f<b.length;f++)if(b[f].b){d=f;break}if(!(d<=c.length&&c.length<=e))throw d===e?(b=d,d=1===d?"argument":"arguments"):(b="between "+d+" and "+e,d="arguments"),new v("invalid-argument-count","Invalid argument count in `"+a+"`: Expected "+b+" "+d+", received "+c.length+".");for(f=0;f<c.length;f++)try{b[f].a(c[f])}catch(g){if(g instanceof Error)throw na(f,a,g.message);throw na(f,a,g);}},U=function(a,b){var c=this;this.a=function(b){c.b&&!n(b)||a(b)};
this.b=!!b},Xd=function(a,b){return function(c){a(c);b(c)}},Yd=function(a,b){function c(a){if(!("string"===typeof a||a instanceof String))throw"Expected string.";}var d;a?d=Xd(c,a):d=c;return new U(d,b)},Zd=function(){return new U(function(a){if(!(a instanceof Blob))throw"Expected Blob or File.";})},$d=function(){return new U(function(a){if(!(("number"===typeof a||a instanceof Number)&&0<=a))throw"Expected a number 0 or greater.";})},ae=function(a,b){return new U(function(b){if(!(null===b||y(b)&&
b instanceof Object))throw"Expected an Object.";y(a)&&a(b)},b)},be=function(){return new U(function(a){if(null!==a&&!r(a))throw"Expected a Function.";},!0)};var ce=function(a){if(!a)throw la();},de=function(a,b){return function(c,d){a:{var e;try{e=JSON.parse(d)}catch(h){c=null;break a}c=da(e)?e:null}if(null===c)c=null;else{d={type:"file"};e=b.length;for(var f=0;f<e;f++){var g=b[f];d[g.b]=g.a(d,c[g.c])}Ud(d,a);c=d}ce(null!==c);return c}},ee=function(a){return function(b,c){b=401===Q(b)?new v("unauthenticated","User is not authenticated, please authenticate using Firebase Authentication and try again."):402===Q(b)?new v("quota-exceeded","Quota for bucket '"+
a.bucket+"' exceeded, please view quota on https://firebase.google.com/pricing/."):403===Q(b)?new v("unauthorized","User does not have permission to access '"+a.path+"'."):c;b.serverResponse=c.serverResponse;return b}},fe=function(a){var b=ee(a);return function(c,d){var e=b(c,d);404===Q(c)&&(e=new v("object-not-found","Object '"+a.path+"' does not exist."));e.serverResponse=d.serverResponse;return e}},ge=function(a,b,c){var d=La(b);a=new w(ka+"/v0"+d,"GET",de(a,c),a.c);a.a=fe(b);return a},he=function(a,
b){var c=La(b);a=new w(ka+"/v0"+c,"DELETE",function(){},a.c);a.h=[200,204];a.a=fe(b);return a},ie=function(a,b,c){c=c?qa(c):{};c.fullPath=a.path;c.size=b.size;c.contentType||(c.contentType=b&&b.type||"application/octet-stream");return c},je=function(a,b,c,d,e){var f="/b/"+encodeURIComponent(b.bucket)+"/o",g={"X-Goog-Upload-Protocol":"multipart"},h;h="";for(var l=0;2>l;l++)h+=Math.random().toString().slice(2);g["Content-Type"]="multipart/related; boundary="+h;e=ie(b,d,e);l=Vd(e,c);d=Kd("--"+h+"\r\nContent-Type: application/json; charset=utf-8\r\n\r\n"+
l+"\r\n--"+h+"\r\nContent-Type: "+e.contentType+"\r\n\r\n",d,"\r\n--"+h+"--");a=new w(ka+"/v0"+f,"POST",de(a,c),a.b);a.f={name:e.fullPath};a.b=g;a.c=d;a.a=ee(b);return a},ke=function(a,b,c,d){this.a=a;this.total=b;this.b=!!c;this.c=d||null},le=function(a,b){var c;try{c=Ed(a,"X-Goog-Upload-Status")}catch(d){ce(!1)}a=0<=bb(b||["active"],c);ce(a);return c},me=function(a,b,c,d,e){var f="/b/"+encodeURIComponent(b.bucket)+"/o",g=ie(b,d,e);e={name:g.fullPath};f=ka+"/v0"+f;d={"X-Goog-Upload-Protocol":"resumable",
"X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":d.size,"X-Goog-Upload-Header-Content-Type":g.contentType,"Content-Type":"application/json; charset=utf-8"};c=Vd(g,c);a=new w(f,"POST",function(a){le(a);var b;try{b=Ed(a,"X-Goog-Upload-URL")}catch(c){ce(!1)}ce(ua(b));return b},a.b);a.f=e;a.b=d;a.c=c;a.a=ee(b);return a},ne=function(a,b,c,d){a=new w(c,"POST",function(a){var b=le(a,["active","final"]),c;try{c=Ed(a,"X-Goog-Upload-Size-Received")}catch(h){ce(!1)}a=c;isFinite(a)&&(a=String(a));
a=q(a)?/^\s*-?0x/i.test(a)?parseInt(a,16):parseInt(a,10):NaN;ce(!isNaN(a));return new ke(a,d.size,"final"===b)},a.b);a.b={"X-Goog-Upload-Command":"query"};a.a=ee(b);return a},oe=function(a,b,c,d,e,f){var g=new ke(0,0);f?(g.a=f.a,g.total=f.total):(g.a=0,g.total=d.size);if(d.size!==g.total)throw new v("server-file-wrong-size","Server recorded incorrect upload file size, please retry the upload.");var h=f=g.total-g.a,h=Math.min(h,262144),l=g.a;f={"X-Goog-Upload-Command":h===f?"upload, finalize":"upload",
"X-Goog-Upload-Offset":g.a};l=Ld(d,l,l+h);if(null===l)throw new v("cannot-slice-blob","Cannot slice blob for upload. Please retry the upload.");c=new w(c,"POST",function(a,c){var f=le(a,["active","final"]),l=g.a+h,Ad=d.size,Va;"final"===f?Va=de(b,e)(a,c):Va=null;return new ke(l,Ad,"final"===f,Va)},b.b);c.b=f;c.c=l;c.g=null;c.a=ee(a);return c};var W=function(a,b,c,d,e,f){this.L=a;this.c=b;this.i=c;this.f=e;this.h=f||null;this.s=d;this.j=0;this.G=this.m=!1;this.B=[];this.$=262144<this.f.size;this.b="running";this.a=this.u=this.g=null;var g=this;this.X=function(a){g.a=null;"storage/canceled"===a.code?(g.m=!0,pe(g)):(g.g=a,V(g,"error"))};this.T=function(a){g.a=null;"storage/canceled"===a.code?pe(g):(g.g=a,V(g,"error"))};this.A=this.l=null;this.F=new H(function(a,b){g.l=a;g.A=b;qe(g)});this.F.then(null,function(){})},qe=function(a){"running"===
a.b&&null===a.a&&(a.$?null===a.u?re(a):a.m?se(a):a.G?te(a):ue(a):ve(a))},we=function(a,b){Qd(a.c).then(function(c){switch(a.b){case "running":b(c);break;case "canceling":V(a,"canceled");break;case "pausing":V(a,"paused")}})},re=function(a){we(a,function(b){var c=me(a.c,a.i,a.s,a.f,a.h);a.a=R(a.c,c,b);a.a.a().then(function(b){a.a=null;a.u=b;a.m=!1;pe(a)},this.X)})},se=function(a){var b=a.u;we(a,function(c){var d=ne(a.c,a.i,b,a.f);a.a=R(a.c,d,c);a.a.a().then(function(b){a.a=null;xe(a,b.a);a.m=!1;b.b&&
(a.G=!0);pe(a)},a.X)})},ue=function(a){var b=new ke(a.j,a.f.size),c=a.u;we(a,function(d){var e;try{e=oe(a.i,a.c,c,a.f,a.s,b)}catch(f){a.g=f;V(a,"error");return}a.a=R(a.c,e,d);a.a.a().then(function(b){a.a=null;xe(a,b.a);b.b?(a.h=b.c,V(a,"success")):pe(a)},a.X)})},te=function(a){we(a,function(b){var c=ge(a.c,a.i,a.s);a.a=R(a.c,c,b);a.a.a().then(function(b){a.a=null;a.h=b;V(a,"success")},a.T)})},ve=function(a){we(a,function(b){var c=je(a.c,a.i,a.s,a.f,a.h);a.a=R(a.c,c,b);a.a.a().then(function(b){a.a=
null;a.h=b;xe(a,a.f.size);V(a,"success")},a.X)})},xe=function(a,b){var c=a.j;a.j=b;a.j>c&&ye(a)},V=function(a,b){if(a.b!==b)switch(b){case "canceling":a.b=b;null!==a.a&&a.a.b();break;case "pausing":a.b=b;null!==a.a&&a.a.b();break;case "running":var c="paused"===a.b;a.b=b;c&&(ye(a),qe(a));break;case "paused":a.b=b;ye(a);break;case "canceled":a.g=ma();a.b=b;ye(a);break;case "error":a.b=b;ye(a);break;case "success":a.b=b,ye(a)}},pe=function(a){switch(a.b){case "pausing":V(a,"paused");break;case "canceling":V(a,
"canceled");break;case "running":qe(a)}};W.prototype.D=function(){return new A(this.j,this.f.size,ta(this.b),this.h,this,this.L)};
W.prototype.P=function(a,b,c,d){function e(a){try{g(a);return}catch(b){}try{if(h(a),!(n(a.next)||n(a.error)||n(a.complete)))throw"";}catch(b){throw"Expected a function or an Object with one of `next`, `error`, `complete` properties.";}}function f(a){return function(b,c,d){null!==a&&T("on",a,arguments);var e=new Na(b,c,d);ze(l,e);return function(){jb(l.B,e)}}}var g=be().a,h=ae(null,!0).a;T("on",[Yd(function(){if("state_changed"!==a)throw"Expected one of the event types: [state_changed].";}),ae(e,!0),
be(),be()],arguments);var l=this,B=[ae(function(a){if(null===a)throw"Expected a function or an Object with one of `next`, `error`, `complete` properties.";e(a)}),be(),be()];return n(b)||n(c)||n(d)?f(null)(b,c,d):f(B)};W.prototype.then=function(a,b){return this.F.then(a,b)};
var ze=function(a,b){a.B.push(b);Ae(a,b)},ye=function(a){Be(a);var b=kb(a.B);cb(b,function(b){Ae(a,b)})},Be=function(a){if(null!==a.l){var b=!0;switch(ta(a.b)){case "success":Dc(a.l.bind(null,a.D()))();break;case "canceled":case "error":Dc(a.A.bind(null,a.g))();break;default:b=!1}b&&(a.l=null,a.A=null)}},Ae=function(a,b){switch(ta(a.b)){case "running":case "paused":null!==b.next&&Dc(b.next.bind(b,a.D()))();break;case "success":null!==b.a&&Dc(b.a.bind(b))();break;case "canceled":case "error":null!==
b.error&&Dc(b.error.bind(b,a.g))();break;default:null!==b.error&&Dc(b.error.bind(b,a.g))()}};W.prototype.S=function(){T("resume",[],arguments);var a="paused"===this.b||"pausing"===this.b;a&&V(this,"running");return a};W.prototype.R=function(){T("pause",[],arguments);var a="running"===this.b;a&&V(this,"pausing");return a};W.prototype.M=function(){T("cancel",[],arguments);var a="running"===this.b||"pausing"===this.b;a&&V(this,"canceling");return a};var X=function(a,b){this.b=a;if(b)this.a=b instanceof z?b:Ma(b);else if(a=a.bucket(),null!==a)this.a=new z(a,"");else throw new v("no-default-bucket","No default bucket found. Did you set the 'storageBucket' property when initializing the app?");};X.prototype.toString=function(){T("toString",[],arguments);return"gs://"+this.a.bucket+"/"+this.a.path};var Ce=function(a,b){return new X(a,b)};k=X.prototype;
k.ha=function(a){T("child",[Yd()],arguments);var b=tb(this.a.path,a);return Ce(this.b,new z(this.a.bucket,b))};k.Fa=function(){var a;a=this.a.path;if(0==a.length)a=null;else{var b=a.lastIndexOf("/");a=-1===b?"":a.slice(0,b)}return null===a?null:Ce(this.b,new z(this.a.bucket,a))};k.Ha=function(){return Ce(this.b,new z(this.a.bucket,""))};k.pa=function(){return this.a.bucket};k.Aa=function(){return this.a.path};k.Ea=function(){return ub(this.a.path)};k.Ja=function(){return this.b.i};
k.ua=function(a,b){T("put",[Zd(),new U(Wd,!0)],arguments);De(this,"put");return new W(this,this.b,this.a,Td(),a,b)};k.delete=function(){T("delete",[],arguments);De(this,"delete");var a=this;return Qd(this.b).then(function(b){var c=he(a.b,a.a);return R(a.b,c,b).a()})};k.ia=function(){T("getMetadata",[],arguments);De(this,"getMetadata");var a=this;return Qd(this.b).then(function(b){var c=ge(a.b,a.a,Td());return R(a.b,c,b).a()})};
k.va=function(a){T("updateMetadata",[new U(Wd,void 0)],arguments);De(this,"updateMetadata");var b=this;return Qd(this.b).then(function(c){var d=b.b,e=b.a,f=a,g=Td(),h=La(e),h=ka+"/v0"+h,f=Vd(f,g),d=new w(h,"PATCH",de(d,g),d.c);d.b={"Content-Type":"application/json; charset=utf-8"};d.c=f;d.a=fe(e);return R(b.b,d,c).a()})};
k.ta=function(){T("getDownloadURL",[],arguments);De(this,"getDownloadURL");return this.ia().then(function(a){a=a.downloadURLs[0];if(y(a))return a;throw new v("no-download-url","The given file does not have any download URLs.");})};var De=function(a,b){if(""===a.a.path)throw new v("invalid-root-operation","The operation '"+b+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').");};var Y=function(a){this.a=new Pd(a,function(a,c){return new X(a,c)},Jd,this);this.b=a;this.c=new Ee(this)};k=Y.prototype;k.wa=function(a){T("ref",[Yd(function(a){if(/^[A-Za-z]+:\/\//.test(a))throw"Expected child path but got a URL, use refFromURL instead.";},!0)],arguments);var b=new X(this.a);return n(a)?b.ha(a):b};
k.xa=function(a){T("refFromURL",[Yd(function(a){if(!/^[A-Za-z]+:\/\//.test(a))throw"Expected full URL but got a child path, use ref instead.";try{Ma(a)}catch(c){throw"Expected valid full URL but got an invalid one.";}},!1)],arguments);return new X(this.a,a)};k.Ca=function(){return this.a.b};k.za=function(a){T("setMaxUploadRetryTime",[$d()],arguments);this.a.b=a};k.Ba=function(){return this.a.c};k.ya=function(a){T("setMaxOperationRetryTime",[$d()],arguments);this.a.c=a};k.oa=function(){return this.b};
k.ma=function(){return this.c};var Ee=function(a){this.a=a};Ee.prototype.delete=function(){var a=this.a.a;a.f=!0;a.a=null;a.h.clear()};var Z=function(a,b,c){Object.defineProperty(a,b,{get:c})};X.prototype.toString=X.prototype.toString;X.prototype.child=X.prototype.ha;X.prototype.put=X.prototype.ua;X.prototype["delete"]=X.prototype.delete;X.prototype.getMetadata=X.prototype.ia;X.prototype.updateMetadata=X.prototype.va;X.prototype.getDownloadURL=X.prototype.ta;Z(X.prototype,"parent",X.prototype.Fa);Z(X.prototype,"root",X.prototype.Ha);Z(X.prototype,"bucket",X.prototype.pa);Z(X.prototype,"fullPath",X.prototype.Aa);
Z(X.prototype,"name",X.prototype.Ea);Z(X.prototype,"storage",X.prototype.Ja);Y.prototype.ref=Y.prototype.wa;Y.prototype.refFromURL=Y.prototype.xa;Z(Y.prototype,"maxOperationRetryTime",Y.prototype.Ba);Y.prototype.setMaxOperationRetryTime=Y.prototype.ya;Z(Y.prototype,"maxUploadRetryTime",Y.prototype.Ca);Y.prototype.setMaxUploadRetryTime=Y.prototype.za;Z(Y.prototype,"app",Y.prototype.oa);Z(Y.prototype,"INTERNAL",Y.prototype.ma);Ee.prototype["delete"]=Ee.prototype.delete;
Y.prototype.capi_=function(a){ka=a};W.prototype.on=W.prototype.P;W.prototype.resume=W.prototype.S;W.prototype.pause=W.prototype.R;W.prototype.cancel=W.prototype.M;Z(W.prototype,"snapshot",W.prototype.D);Z(A.prototype,"bytesTransferred",A.prototype.qa);Z(A.prototype,"totalBytes",A.prototype.La);Z(A.prototype,"state",A.prototype.Ia);Z(A.prototype,"metadata",A.prototype.Da);Z(A.prototype,"downloadURL",A.prototype.sa);Z(A.prototype,"task",A.prototype.Ka);Z(A.prototype,"ref",A.prototype.Ga);
ra.STATE_CHANGED="state_changed";sa.RUNNING="running";sa.PAUSED="paused";sa.SUCCESS="success";sa.CANCELED="canceled";sa.ERROR="error";H.prototype["catch"]=H.prototype.l;H.prototype.then=H.prototype.then;
(function(){function a(a){return new Y(a)}var b={TaskState:sa,TaskEvent:ra,Storage:Y,Reference:X};if(window.firebase&&firebase.INTERNAL&&firebase.INTERNAL.registerService)firebase.INTERNAL.registerService("storage",a,b);else throw Error("Cannot install Firebase Storage - be sure to load firebase-app.js first.");})();})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
const todoInput = document.querySelector('.todo-form input')
const todosList = document.querySelector('ul.todos')

const ui = {
  /**
   * Add a DOM representation of the todo
   *
   * @param {Todo} todo
   * @param {String} id
   */
  addTodo: function (todo) {
    // add to list
    let todoLi = document.createElement('li')
    todoLi.textContent = todo.title
    todoLi.setAttribute('id', todo.id)
    todosList.appendChild(todoLi)
    // clear input
    todoInput.value = ''
  },
  /**
   * Update all todos, use it in the first rendering
   *
   * @param {Array} list of all todos
   */
  updateTodos: function (todos) {
    todos.toArray().then(function (todosArray) {
      todosArray.forEach(function (todo) {
        let todoLi = document.createElement('li')
        todoLi.textContent = todo.title
        todoLi.setAttribute('id', todo.id)
        todosList.appendChild(todoLi)
      })
    })
  },
  /**
   * Mark all todos as checked
   */
  checkAll: function () {
    let todosLi = todosList.querySelectorAll('li')
    Array.prototype.forEach.call(todosLi, function (todoLi) {
      todoLi.classList.add('checked')
    })
  },
  /**
   * Remove a single todo from the ul list
   *
   * @param {Todo} todo
   */
  removeTodo: function (todo) {
    const todoEl = document.getElementById(todo.id)
    todoEl.parentNode.removeChild(todoEl)
  },
  /**
   * Update a todo
   *
   * @param {Todo} oldTodo
   * @param {Todo} newTodo
   */
  setTodo: function (oldTodo, newTodo) {
    const todoEl = document.getElementById(oldTodo.id)
    // set the title
    todoEl.textContent = newTodo.title
    // set the id
    todoEl.setAttribute('id', newTodo.id)
    // set the state
    todoEl.classList.add(newTodo.checked ? 'checked' : '')
  }
}
// manage the ui for todos
module.exports = ui

},{}]},{},[1]);
