const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  app.use(
    createProxyMiddleware("/api", {
      target: process.env.REACT_APP_API_PROXY || "http://127.0.0.1:4000",
      changeOrigin: true,
    }),
  );
};
