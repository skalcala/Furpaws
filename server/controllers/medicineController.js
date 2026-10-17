const { controllerFor } = require("./resourceController");
const {
  getX: getMedicines,
  createX: createMedicine,
  updateX: updateMedicine,
  deleteX: deleteMedicine,
} = controllerFor("medicines");
module.exports = {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
