const passwordValid = password => typeof password === "string" && password.length >= 8 && password.length <= 72 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
module.exports = { passwordValid };
