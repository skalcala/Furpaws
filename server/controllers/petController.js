const { Pet, Consultation, Vaccination, Appointment } = require("../models");
const {
  fail,
  pick,
  getDoc,
  audit,
  notify,
  transaction,
  assertFields,
} = require("../utils/core");
const checkPet = async (user, id) => {
  const pet = await getDoc(Pet, id);
  if (
    user.role === "OWNER" &&
    (String(pet.owner) !== String(user._id) || pet.status !== "Approved")
  )
    fail(404, "Pet not found.");
  return pet;
};
const getPets = async (req, res) =>
  res.json(
    await Pet.find(
      req.user.role === "OWNER"
        ? { owner: req.user._id, status: "Approved" }
        : {},
    ).populate("owner", "name email phone address"),
  );
const getPet = async (req, res) => {
  const pet = await checkPet(req.user, req.params.id);
  await pet.populate("owner", "name email phone address");
  res.json(pet);
};
const getRecords = async (req, res) => {
  const pet = await checkPet(req.user, req.params.id);
  const [consultations, vaccinations, appointments] = await Promise.all([
    Consultation.find({ pet: pet._id }).select("-prescriptions")
      .populate("admin", "name")
      .sort({ createdAt: -1 }),
    Vaccination.find({ pet: pet._id }),
    Appointment.find({ pet: pet._id }).populate("service"),
  ]);
  res.json({ pet, consultations, vaccinations, appointments });
};
const updatePet = async (req, res) => {
  await checkPet(req.user, req.params.id);
  res.json(
    await transaction(async (session) => {
      const pet = await getDoc(Pet, req.params.id, session);
      const before = pet.toObject();
      const keys =
        req.user.role === "OWNER"
          ? ["picture"]
          : ["name", "species", "otherSpecies", "breed", "birthDate", "picture"];
      assertFields(req.body, keys);
      if (req.body.birthDate && new Date(req.body.birthDate) > new Date())
        fail(400, "Birth date cannot be in the future.", {
          birthDate: "Choose a past date.",
        });
      Object.assign(pet, pick(req.body, keys));
      if (
        pet.picture &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(pet.picture) &&
        !/^\/assets\/\w+\.png$/.test(pet.picture)
      )
        fail(400, "Use a PNG, JPG, or WebP image.");
      await pet.save({ session });
      await audit(
        req.user,
        "Edit",
        "pets",
        pet._id,
        { ...before, picture: undefined },
        { ...pet.toObject(), picture: undefined },
        session,
      );
      return pet;
    }),
  );
};
const approvePet = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["status", "reason"]);
      const pet = await getDoc(Pet, req.params.id, session);
      if (pet.status !== "Pending")
        fail(409, "This pet has already been reviewed.");
      if (!["Approved", "Declined"].includes(req.body.status))
        fail(400, "Choose Approved or Declined.");
      if (req.body.status === "Declined" && !req.body.reason?.trim())
        fail(400, "A decline reason is required.", {
          reason: "Decline reason is required.",
        });
      const before = pet.toObject();
      pet.status = req.body.status;
      pet.declineReason = req.body.reason;
      await pet.save({ session });
      await notify(
        {
          owner: pet.owner,
          pet: pet._id,
          title: `Pet ${pet.status.toLowerCase()}`,
          message: `${pet.name}: ${pet.status}.${pet.status === "Declined" ? ` Reason: ${pet.declineReason}` : ""}`,
        },
        session,
      );
      await audit(
        req.user,
        pet.status,
        "pets",
        pet._id,
        before,
        pet.toObject(),
        session,
      );
      return pet;
    }),
  );
module.exports = { getPets, getPet, getRecords, updatePet, approvePet };
