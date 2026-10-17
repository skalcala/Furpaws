const mongoose = require("mongoose");

let connectionPromise;
async function connectDatabase() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    const error = new Error("Production database or authentication is not configured.");
    error.code = "CONFIGURATION_MISSING";
    throw error;
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
      })
      .then(async () => {
        for (const Model of Object.values(require("./models"))) await Model.init();
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}

module.exports = { connectDatabase };
