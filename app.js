/* global navigator */
(function () {
  'use strict'
  const Dexie = require('dexie')
  const firebase = require('firebase')

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
  }

  /**
   * Add a new todo
   *
   * @param {Todo} todo
   */
  app.addTodo = function (todo) {
    // saves to local db
    db.todos.add(todo)

    // try to save asynchronously to firebase
    if (navigator.online) {
      var newTodoRef = rootRef.push()
      newTodoRef.set(todo)
    } else {
      app.shouldUpdate = true
    }
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
  }

  /**
   * update local data from database, only after recovering internet connection
   *
   * @return {Boolean}
   */
  app.update = function () {
    // only update if needed
    if (app.shouldUpdate) {

    }
  }

  /**
   * if conectivity changes back to online, update if there is difference in local data and online data
   */
  window.addEventListener('online', app.update())

  // for first load
  app.todos = db.todos
  if (app.todos) {
    // update the DOM
  } else {
    app.getTodos()
    // update the DOM
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
})()
