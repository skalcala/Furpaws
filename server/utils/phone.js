const { fail } = require("./core");
function normalizePhone(value) {
  const phone = String(value || "").trim();
  if (!/^(09\d{9}|\+639\d{9})$/.test(phone))
    fail(400, "Use 09XXXXXXXXX or +639XXXXXXXXX.", {
      phone: "Enter a valid PH mobile number.",
    });
  return phone.startsWith("09") ? "+63" + phone.slice(1) : phone;
}
const phoneVariants = (value) => {
  const normalized = normalizePhone(value);
  return [normalized, "0" + normalized.slice(3)];
};
module.exports = { normalizePhone, phoneVariants };
