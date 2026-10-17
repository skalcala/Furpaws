const { controllerFor } = require("./resourceController");
const {
  getX: getExpenses,
  createX: createExpense,
  updateX: updateExpense,
  deleteX: deleteExpense,
} = controllerFor("expenses");
module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
