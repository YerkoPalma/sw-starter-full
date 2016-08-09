const todoInput = document.querySelector('.todo-form input')
const todosList = document.querySelector('ul.todos')
const Todo = require('./Todo')

const ui = {
  /**
   * Add a DOM representation of the todo
   *
   * @param {Todo} todo
   * @param {String} id
   */
  addTodo: function (todo, handler) {
    // add to list
    let todoLi = document.createElement('li')
    let todoCheckbox = document.createElement('input')
    todoCheckbox.setAttribute('type', 'checkbox')
    todoCheckbox.setAttribute('data-for', todo._id)
    todoCheckbox.addEventListener('change', function (e) {
      const oldTodo = todo
      // only toggle the state
      const newTodo = new Todo({
        title: todo.title,
        _id: todo._id,
        checked: !todo.checked,
        date: new Date()
      })
      handler(oldTodo, newTodo)
    })
    todoLi.textContent = todo.title
    todoLi.setAttribute('id', todo._id)
    todoLi.appendChild(todoCheckbox)
    todosList.appendChild(todoLi)
    // clear input
    todoInput.value = ''
  },
  /**
   * Update all todos, use it in the first rendering
   *
   * @param {Array} list of all todos
   */
  updateTodos: function (todos, handler) {
    // reset list
    todosList.innerHTML = ''
    todos.forEach(function (todo) {
      let todoLi = document.createElement('li')
      let todoCheckbox = document.createElement('input')
      todoCheckbox.setAttribute('type', 'checkbox')
      todoCheckbox.setAttribute('data-for', todo._id)
      todoCheckbox.addEventListener('change', function (e) {
        const oldTodo = todo
        // only toggle the state
        const newTodo = new Todo({
          title: todo.title,
          _id: todo._id,
          checked: !todo.checked,
          date: new Date()
        })
        handler(oldTodo, newTodo)
      })
      todoLi.textContent = todo.title
      todoLi.setAttribute('id', todo._id)
      todoLi.appendChild(todoCheckbox)
      if (todo.checked) {
        todoLi.classList.add('checked')
      } else if (todoLi.classList.contains('checked')) {
        todoLi.classList.remove('checked')
      }
      todoLi.querySelector('input[type="checkbox"]').checked = todo.checked
      todosList.appendChild(todoLi)
    })
  },
  /**
   * Update a todo
   *
   * @param {Todo} oldTodo
   * @param {Todo} newTodo
   */
  setTodo: function (oldTodo, newTodo) {
    const todoEl = document.getElementById(oldTodo._id)
    // set the state
    if (newTodo.checked) {
      todoEl.classList.add('checked')
    } else if (todoEl.classList.contains('checked')) {
      todoEl.classList.remove('checked')
    }
    todoEl.querySelector('input[type="checkbox"]').checked = newTodo.checked
  }
}
// manage the ui for todos
module.exports = ui
