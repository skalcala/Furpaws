import axios from "axios";
export const api = axios.create({ baseURL: "/api", timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("furpawsToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      sessionStorage.removeItem("furpawsToken");
      window.dispatchEvent(new Event("furpaws:logout"));
    }
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  error.response?.data?.message ||
  (error.code === "ECONNABORTED"
    ? "The request took too long. Please try again."
    : "Unable to reach the clinic. Check your connection and try again.");
export const money = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dayKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const formatTime = (time) =>
  time
    ? new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const shortId = (id, prefix = "") =>
  `${prefix}${String(id || "")
    .slice(-6)
    .toUpperCase()}`;
