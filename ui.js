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
    todoLi.setAttribute('id', todo._id)
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
    todos.forEach(function (todo) {
      let todoLi = document.createElement('li')
      todoLi.textContent = todo.title
      todoLi.setAttribute('id', todo._id)
      todosList.appendChild(todoLi)
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
    const todoEl = document.getElementById(todo._id)
    todoEl.parentNode.removeChild(todoEl)
  },
  /**
   * Update a todo
   *
   * @param {Todo} oldTodo
   * @param {Todo} newTodo
   */
  setTodo: function (oldTodo, newTodo) {
    const todoEl = document.getElementById(oldTodo._id)
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
