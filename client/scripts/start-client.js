// Create React App startup, matching the teacher's React lessons.
// Leave BROWSER unset so Create React App opens the default browser automatically.
process.env.HOST = process.env.HOST || "127.0.0.1";
process.env.PORT = process.env.CLIENT_PORT || "3000";
require("react-scripts/scripts/start");
