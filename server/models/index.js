// Per-resource Mongoose models, following the teacher's models/User.js pattern.
module.exports = {
  Counter: require("./Counter"),
  User: require("./User"),
  EmailOtp: require("./EmailOtp"),
  OtpLimit: require("./OtpLimit"),
  Pet: require("./Pet"),
  Appointment: require("./Appointment"),
  Consultation: require("./Consultation"),
  Medicine: require("./Medicine"),
  Vaccination: require("./Vaccination"),
  Service: require("./Service"),
  Schedule: require("./Schedule"),
  Bill: require("./Bill"),
  Expense: require("./Expense"),
  Notification: require("./Notification"),
  AuditLog: require("./AuditLog"),
};
