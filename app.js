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
    // ensure that local db has an exact copy of remote db
    db.todos.clear().then(function () {
      db.todos.bulkPut(realResponse).then(function () {
        console.log('[app.getTodos] Done putting todos in local db')
      }).catch(function (err) {
        console.log(err)
      })
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
  // Your service-worker.js *must* be located at the top-level directory relative to your site.
  // It won't be able to control pages unless it's located at the same level or higher than them.
  // *Don't* register service worker file in, e.g., a scripts/ sub-directory!
  // See https://github.com/slightlyoff/ServiceWorker/issues/468
  navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
    // updatefound is fired if service-worker.js changes.
    reg.onupdatefound = function () {
      // The updatefound event implies that reg.installing is set; see
      // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
      var installingWorker = reg.installing

      installingWorker.onstatechange = function () {
        switch (installingWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              // At this point, the old content will have been purged and the fresh content will
              // have been added to the cache.
              // It's the perfect time to display a "New content is available; please refresh."
              // message in the page's interface.
              console.log('New or updated content is available.')
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              console.log('Content is now available offline!')
            }
            break

          case 'redundant':
            console.error('The installing service worker became redundant.')
            break
        }
      }
      // sw can also send messages
      installingWorker.addEventListener('message', function (e) {
        // handle db data from sw
      })
    }
  }).catch(function (e) {
    console.error('Error during service worker registration:', e)
  })
}
