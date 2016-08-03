/* global navigator caches */
(function () {
  'use strict'
  const Dexie = require('dexie')

  let app = {}
  let db = new Dexie('todos')
  db.version(1).stores({
    todos: '++id,title,state,date'
  })

  db.open().catch(function (err) {
    console.log(err)
  })

  // define Todo class
  function Todo (args) {
    this.title = args ? args.title : ''
    this.state = args ? args.state : false
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
    const url = 'https://sw-full.firebaseio.com/todos.json'

    // update from the cache
    if ('caches' in window) {
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(function (json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasRequestPending) {
              console.log('[app] updated from cache')
              db.todos.add(json)
              app.todos = db.todos
            }
          }).catch(function (err) {
            console.log('[app] Error while fetching cache in getTodos' + err)
          })
        }
      })
    }

    // update from the database
    // Make the XHR to get the data, then update the card
    app.hasRequestPending = true
    var request = new XMLHttpRequest()
    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          console.log('[app] updated from firebase')
          var response = JSON.parse(request.response)
          app.hasRequestPending = false
          app.todos = response
          db.clear().then(function () {
            db.bulkAdd(response)
          }).catch(function (err) {
            console.log('[app] Error while fetching database in getTodos' + err)
          })
        }
      }
    }
    request.open('GET', url)
    request.send()
  }

  /**
   * Add a new todo
   *
   * @param {Todo} todo
   */
  app.addTodo = function (todo) {
    // saves to local db

    // try to save asynchronously to firebase

  }

  /**
   * Remove a todo
   *
   * @param {Todo} todo
   * @return {Boolean}
   */
  app.removeTodo = function (todo) {

  }

  /**
   * Update a single todo
   *
   * @param {Todo} oldTodo
   * @param {Todo} newTodo
   * @return {Boolean}
   */
  app.setTodo = function (oldTodo, newTodo) {

  }

  /**
   * Set all todos as finished
   *
   * @return {Boolean}
   */
  app.checkAll = function () {

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
