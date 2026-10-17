const { controllerFor } = require("./resourceController");
const {
  getX: getServices,
  createX: createService,
  updateX: updateService,
  deleteX: deleteService,
} = controllerFor("services");
module.exports = { getServices, createService, updateService, deleteService };
