const { controllerFor } = require("./resourceController");
const {
  getX: getSchedules,
  createX: createSchedule,
  updateX: updateSchedule,
  deleteX: deleteSchedule,
} = controllerFor("schedules");
module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
