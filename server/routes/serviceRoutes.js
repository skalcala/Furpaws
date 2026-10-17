const router = require("express").Router();
const { role } = require("../middleware/auth");
const {
  getServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");
router.get("/", getServices);
router.post("/", role("ADMIN"), createService);
router.patch("/:id", role("ADMIN"), updateService);
router.delete("/:id", role("ADMIN"), deleteService);
module.exports = router;
