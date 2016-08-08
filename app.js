/* global navigator */
const Dexie = require('dexie')
const xhr = require('xhr')
const uiManager = require('./ui')
const Todo = require('./Todo')
const url = 'https://sw-full.firebaseio.com/todos.json'

'use strict'

let app = {}
let db = new Dexie('todos')
db.version(1).stores({
  todos: '++id,title,checked,date'
})

db.open().catch(function (err) {
  console.log(err)
})

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

  xhr.get(url, function (err, response) {
    if (err) {
      // update local db
      db.todos.toArray().then(function (todos) {
        app.todos = todos
        console.log('[app.getTodos] Done getting todos from local db')

        // update the view
        uiManager.updateTodos(app.todos, app.setTodo)
      })
      console.log(err)
      return
    }
    // uggly hack for firebase
    const jsonData = JSON.parse(response.body)
    const responseKeys = Object.keys(jsonData)
    const realResponse = responseKeys.map(function (key) {
      let returned = jsonData[key]
      returned._id = key
      return returned
    })
    app.todos = realResponse
    // update the view
    uiManager.updateTodos(app.todos, app.setTodo)

    console.log('[app.getTodos] Done retrieving data from firebase')
    db.todos.bulkPut(realResponse).then(function () {
      console.log('[app.getTodos] Done putting todos in local db')
    }).catch(function (err) {
      console.log(err)
    })
  })
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
    checked: false,
    date: new Date()
  })

  // try to save asynchronously to firebase
  xhr.post(url, { body: todo.toObjectString() }, function (err, response) {
    if (err) {
      app.shouldUpdate = true
      console.log(err)
    }
    todo._id = JSON.parse(response.body).name
    app.todos.push(todo)
    db.todos.add(todo.toObject())
    .then(function () {
      // update the view
      uiManager.addTodo(todo, app.setTodo)
      console.log('[app.getTodo] Done adding todo to local db')
    }).catch(function (err) {
      console.log(err)
    })
    console.log('[app.getTodo] Done adding todo to firebase')
  })
}

/**
 * Update a single todo
 *
 * @param {Todo} oldTodo
 * @param {Todo} newTodo
 * @return {Boolean}
 */
app.setTodo = function (oldTodo, newTodo) {
  const obj = `{
      "${oldTodo._id}": ${newTodo.toObjectString()}
    }
  `
  // update firebase
  xhr.patch(url, { body: obj }, function (err, response) {
    if (err) {
      app.shouldUpdate = true
      console.log(err)
    }
    app.todos[app.todos.indexOf(oldTodo)] = newTodo
    // update local db
    db.todos.update(oldTodo._id, newTodo).then(function (updated) {
      if (updated) {
        console.log('[app.setTodo] todo updated')
      } else {
        console.log('[app.setTodo] todo NOT updated')
      }
      // update the view
      uiManager.setTodo(oldTodo, newTodo)
    })
  })
}

/**
 * Update local data from database, only after recovering internet connection
 *
 * @return {Boolean}
 */
app.update = function () {
  // only update if needed
  if (app.shouldUpdate) {
    // should be enough
    app.getTodos()
  }
}

/**
 * If conectivity changes back to online, update if there is difference in local data and online data
 */
window.addEventListener('online', app.update())

document.querySelector('.todo-form').addEventListener('submit', function (e) {
  e.preventDefault()
  app.addTodo(document.getElementById('todo-input').value)
})

// for the first load
db.todos.toArray().then(function (todosArray) {
  if (todosArray && todosArray.length > 0) {
    app.todos = todosArray
    uiManager.updateTodos(app.todos)
  }
  // update from db always
  app.getTodos()
})

// register the service worker
if ('serviceWorker' in navigator) {
  navigator
    .serviceWorker
    .register('/service-worker.js')
    .then(function () {
      console.log('[app]', 'Service Worker Registered')
    })
}
