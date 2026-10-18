require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:3000" }));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.get("/api/internal/reminders", async (req, res) => {
  const secrets = [process.env.CRON_SECRET, process.env.REMINDER_JOB_SECRET].filter(Boolean);
  if (!secrets.some(secret => req.headers.authorization === `Bearer ${secret}`))
    return res.status(401).json({ message: "Unauthorized." });
  await require("./utils/reminders").generateReminders();
  res.json({ status: "ok" });
});
app.use("/api", require("./routes"));
app.use("/api", (req, res) =>
  res.status(404).json({ message: "Endpoint not found." }),
);
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/build/index.html")),
);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  let errors = error.errors;
  if (error.name === "ValidationError") {
    status = 400;
    message = "Please check the highlighted fields.";
    errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, value]) => [
        field,
        value.message,
      ]),
    );
  }
  if (error.name === "CastError" || error.name === "StrictModeError") {
    status = 400;
    message = "Please check the submitted values.";
  }
  if (error.code === 11000) {
    status = 409;
    message = "This record already exists.";
  }
  if (status === 500) {
    console.error(error);
    message = "The clinic could not save your changes. Please try again.";
  }
  res.status(status).json({ message, errors });
});
const start = async () => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET)
    throw new Error("Set MONGODB_URI and JWT_SECRET in server/.env before starting the clinic API.");
  await mongoose.connect(process.env.MONGODB_URI);
  for (const Model of Object.values(require("./models"))) await Model.init();
  const { generateReminders } = require("./utils/reminders");
  await generateReminders();
  setInterval(() => generateReminders().catch(console.error), 60000).unref();
  return app.listen(process.env.PORT || 4000, "127.0.0.1", () =>
    console.log(`FurPaws API: http://127.0.0.1:${process.env.PORT || 4000}`),
  );
};
if (require.main === module)
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
module.exports = { app, start };
