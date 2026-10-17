const mongoose = require("mongoose");
const ref = (model, required = true) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: model,
  required,
});
const text = (required = false, maxLength = 200) => ({
  type: String,
  trim: true,
  required,
  maxlength: maxLength,
});
const number = (required = false, max = 10000000) => ({
  type: Number,
  required,
  min: 0,
  max,
});
module.exports = { ref, text, number };
