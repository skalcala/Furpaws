const express = require("express");
const { auth, role } = require("../middleware/auth");
const users = require("../controllers/userController");
const pets = require("../controllers/petController");
const appointments = require("../controllers/appointmentController");
const consultations = require("../controllers/consultationController");
const resources = require("../controllers/resourceController");
const router = express.Router();
router.post("/auth/login", users.login);
router.post("/auth/register", users.createUser);
router.use(auth);
router.get("/users/me", users.getMe);
router.patch("/users/me", users.updateUser);
router.post("/users/me/password", users.changePassword);
router.get("/users", role("ADMIN"), users.getUsers);
router.get("/pets", pets.getPets);
router.get("/pets/:id", pets.getPet);
router.get("/pets/:id/records", pets.getRecords);
router.patch("/pets/:id", pets.updatePet);
router.post("/pets/:id/decision", role("ADMIN"), pets.approvePet);
router.get("/appointments/slots", appointments.getSlots);
router.get("/appointments", appointments.getAppointments);
router.post("/appointments", role("OWNER"), appointments.createAppointment);
router.patch("/appointments/:id", appointments.updateAppointment);
router.post(
  "/appointments/:id/decision",
  role("ADMIN"),
  appointments.decideAppointment,
);
router.get("/consultations", role("ADMIN"), consultations.getConsultations);
router.post(
  "/consultations/complete",
  role("ADMIN"),
  consultations.completeConsultation,
);
router.patch(
  "/consultations/:id",
  role("ADMIN"),
  consultations.updateConsultation,
);
router.use("/medicines", require("./medicineRoutes"));
router.use("/services", require("./serviceRoutes"));
router.use("/schedules", require("./scheduleRoutes"));
router.use("/expenses", require("./expenseRoutes"));
router.get("/bills", role("ADMIN"), resources.getBills);
router.patch("/bills/:id", role("ADMIN"), resources.updateBill);
router.get(
  "/vaccinations",
  role("ADMIN"),
  require("../controllers/vaccinationController").getVaccinations,
);
router.patch(
  "/vaccinations/:id",
  role("ADMIN"),
  require("../controllers/vaccinationController").updateVaccination,
);
router.get("/notifications", resources.getNotifications);
router.patch("/notifications/:id", resources.updateNotification);
router.get("/auditlogs", role("ADMIN"), resources.getAuditlogs);
router.get("/reports", role("ADMIN"), resources.getReports);
module.exports = router;
