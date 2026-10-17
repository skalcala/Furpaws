const router = require("express").Router();
const { role } = require("../middleware/auth");
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");
router.get("/", role("ADMIN"), getExpenses);
router.post("/", role("ADMIN"), createExpense);
router.patch("/:id", role("ADMIN"), updateExpense);
router.delete("/:id", role("ADMIN"), deleteExpense);
module.exports = router;
