const router = require("express").Router();
const { role } = require("../middleware/auth");
const {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/medicineController");
router.get("/", role("ADMIN"), getMedicines);
router.post("/", role("ADMIN"), createMedicine);
router.patch("/:id", role("ADMIN"), updateMedicine);
router.delete("/:id", role("ADMIN"), deleteMedicine);
module.exports = router;
