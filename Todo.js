// define Todo class
function Todo (args) {
  this.title = args ? args.title : ''
  this.checked = args ? args.checked : false
  this.date = args ? args.date : new Date()
}

Todo.prototype.toObject = function () {
  return {
    title: this.title,
    checked: this.checked,
    date: this.date,
    _id: this._id
  }
}

Todo.prototype.toObjectString = function () {
  return JSON.stringify(this.toObject())
}
module.exports = Todo
