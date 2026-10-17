const { app } = require("../server/server");
const { connectDatabase } = require("../server/database");

// Vercel invokes Express without starting a persistent HTTP listener.
module.exports = async (req, res) => {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error("API database initialization failed:", error.name, error.code);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({
      status: "unavailable",
      database: "disconnected",
      message: error.code === "CONFIGURATION_MISSING"
        ? "The online database is not configured yet. Please contact the clinic."
        : "The clinic database is temporarily unavailable. Please try again shortly.",
    }));
  }
};
