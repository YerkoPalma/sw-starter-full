// manage the ui for todos
module.exports = ui

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
    todos.forEach(function (todo) {
      let todoLi = document.createElement('li')
      todoLi.textContent = todo.title
      todoLi.setAttribute('id', todo.id)
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
  }
}
