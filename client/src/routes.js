// Readable browser paths; legacy screen IDs remain internal for navigation and booking state.
export const adminPaths = {
  "A1": "dashboard",
  "A2": "approvals",
  "A2a": "approvals",
  "A2b": "approvals",
  "A3": "appointments",
  "A4": "todays-queue",
  "A5": "consultations",
  "A5a": "consultations",
  "A5b": "consultations",
  "A5c": "consultations",
  "A6": "pets-and-owners",
  "A6a": "owners",
  "A6b": "pets",
  "A6c": "medical-records",
  "A7": "vaccinations",
  "A8": "medicine-inventory",
  "A9": "services",
  "A10": "schedule-settings",
  "A11": "billing-and-payments",
  "A12": "reports",
  "A13": "expenses",
  "A14": "notifications",
  "A15": "audit-logs"
};
export const ownerPaths = {
  "U1": "dashboard",
  "U2": "settings",
  "U3": "my-pets",
  "U3a": "my-pets",
  "U3b": "pets",
  "U3c": "medical-records",
  "U4": "book-appointment",
  "U5": "book-appointment/register-pet",
  "U6": "book-appointment/schedule",
  "U6a": "book-appointment/schedule",
  "U7": "book-appointment/review",
  "U8": "book-appointment/confirmation",
  "U9": "my-appointments",
  "U10": "notifications"
};
export const screenPath = (role, screen) => (role === "admin" ? adminPaths : ownerPaths)[screen] || screen;
export function screenFromPath(role, pathname) {
  const relative = pathname.replace(new RegExp('^/' + role + '/?'), '').replace(/\/$/, '');
  const paths = role === "admin" ? adminPaths : ownerPaths;
  return Object.keys(paths).sort((a, b) => paths[b].length - paths[a].length).find(key => relative === paths[key] || relative.startsWith(paths[key] + '/')) || relative;
}
