const router = require("express").Router();
const { role } = require("../middleware/auth");
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/scheduleController");
router.get("/", role("ADMIN"), getSchedules);
router.post("/", role("ADMIN"), createSchedule);
router.patch("/:id", role("ADMIN"), updateSchedule);
router.delete("/:id", role("ADMIN"), deleteSchedule);
module.exports = router;
