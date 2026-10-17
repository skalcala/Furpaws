const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ref, text } = require("./schemaFields");

const AuditLogSchema = new mongoose.Schema(
  {
    actor: ref("User"),
    actorName: String,
    action: text(true),
    resource: text(true),
    record: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
  },
  { timestamps: true, strict: "throw" },
);
const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema, "auditlogs");
module.exports = AuditLogModel;
