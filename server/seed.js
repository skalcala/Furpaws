require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  User,
  Pet,
  Appointment,
  Service,
  Medicine,
  Schedule,
  Consultation,
  Vaccination,
  Bill,
  Expense,
  Notification,
} = require("./models");
const { today } = require("./utils/core");
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const Model of Object.values(require("./models"))) await Model.init();
  if (await User.exists({ email: "admin@furpaws.test" })) {
    console.log("Seed already installed. Existing data preserved.");
    return;
  }
  const passwordHash = await bcrypt.hash("FurPaws123", 12);
  const [owner, admin, other] = await User.create([
    {
      name: "Ava Reyes",
      email: "ava@furpaws.test",
      phone: "09175550142",
      address: "24 Maple Street, Quezon City",
      passwordHash,
      role: "OWNER",
    },
    {
      name: "Dr. Elena Cruz",
      email: "admin@furpaws.test",
      phone: "09175550100",
      address: "FurPaws Veterinary Clinic",
      passwordHash,
      role: "ADMIN",
    },
    {
      name: "Noah Lim",
      email: "noah@furpaws.test",
      phone: "09185550186",
      passwordHash,
      role: "OWNER",
    },
  ]);
  const [consultation, vaccination, followup] = await Service.create([
    {
      name: "Consultation",
      description: "Clinical examination and treatment planning",
      fee: 500,
    },
    {
      name: "Vaccination",
      description: "Admin-administered immunization",
      fee: 800,
      type: "Vaccination",
    },
    {
      name: "Follow-up consultation",
      description: "Review of treatment response",
      fee: 350,
    },
  ]);
  const [milo, cleo, luna, bruno] = await Pet.create([
    {
      owner: owner._id,
      name: "Milo",
      species: "Dog",
      breed: "Golden retriever",
      birthDate: "2023-05-18",
      weight: 24.8,
      picture: "/assets/imgPetPicture.png",
      status: "Approved",
      weightHistory: [
        { date: "2026-09-12", weight: 24.5 },
        { date: "2026-10-13", weight: 24.8 },
      ],
    },
    {
      owner: owner._id,
      name: "Cleo",
      species: "Cat",
      breed: "Domestic shorthair",
      birthDate: "2022-02-10",
      weight: 4.2,
      picture: "/assets/imgPetPicture1.png",
      status: "Approved",
    },
    {
      owner: owner._id,
      name: "Luna",
      species: "Cat",
      breed: "Domestic shorthair",
      birthDate: "2025-02-10",
      weight: 3.6,
      status: "Pending",
    },
    {
      owner: other._id,
      name: "Bruno",
      species: "Dog",
      breed: "Beagle",
      birthDate: "2021-01-10",
      weight: 12.4,
      status: "Approved",
    },
  ]);
  const date = today();
  const next = new Date(`${date}T12:00:00+08:00`);
  next.setDate(next.getDate() + 3);
  const future = next.toISOString().slice(0, 10);
  await Schedule.create({
    key: "clinic",
    blockedDates: ["2026-10-17"],
    holidays: ["2026-11-01"],
  });
  const [med] = await Medicine.create([
    {
      name: "Cephalexin 250 mg",
      quantity: 42,
      unit: "tablets",
      price: 25,
      expiryDate: "2027-06-30",
    },
    {
      name: "Amoxicillin 250 mg",
      quantity: 8,
      unit: "tablets",
      price: 20,
      expiryDate: "2027-03-31",
    },
    {
      name: "Carprofen 25 mg",
      quantity: 0,
      unit: "tablets",
      price: 30,
      expiryDate: "2027-06-30",
    },
    {
      name: "Doxycycline 100 mg",
      quantity: 20,
      unit: "capsules",
      price: 15,
      expiryDate: "2026-09-30",
    },
  ]);
  const [visit, booked] = await Appointment.create([
    {
      owner: owner._id,
      pet: milo._id,
      service: consultation._id,
      date,
      time: "14:00",
      bookingType: "With record",
      reasonForVisit:
        "Routine clinic checkup. Please assess appetite, general health, and current care needs.",
      status: "Approved",
      admin: admin._id,
    },
    {
      owner: owner._id,
      pet: luna._id,
      service: consultation._id,
      date: future,
      time: "10:30",
      bookingType: "No record",
      reasonForVisit:
        "My pet has been eating less since yesterday. Please check appetite and overall health.",
    },
    {
      owner: other._id,
      pet: bruno._id,
      service: vaccination._id,
      date: future,
      time: "14:00",
      bookingType: "With record",
      reasonForVisit:
        "Routine clinic checkup. Please assess appetite, general health, and current care needs.",
    },
  ]);
  const previous = await Appointment.create({
    owner: owner._id,
    pet: milo._id,
    service: consultation._id,
    date: "2026-10-13",
    time: "09:00",
    bookingType: "With record",
    reasonForVisit:
      "Routine clinic checkup. Please assess appetite, general health, and current care needs.",
    status: "Completed",
    admin: admin._id,
  });
  const record = await Consultation.create({
    appointment: previous._id,
    pet: milo._id,
    owner: owner._id,
    admin: admin._id,
    weight: 24.8,
    diagnosis: "Mild bacterial dermatitis",
    treatment:
      "Clean affected area daily. Begin antibiotic course and monitor skin response.",
    notes:
      "Skin irritation is localized. Monitor response to treatment and keep the affected area clean.",
    prescriptions: [
      {
        medicine: med._id,
        name: med.name,
        quantity: 14,
        price: 25,
        dosage: "1 tablet",
        frequency: "Twice daily",
        duration: "7 days",
      },
    ],
  });
  await Vaccination.create([
    {
      pet: milo._id,
      owner: owner._id,
      consultation: record._id,
      vaccine: "Rabies",
      dateGiven: "2026-06-15",
      nextDueDate: "2027-06-15",
    },
    {
      pet: cleo._id,
      owner: owner._id,
      consultation: record._id,
      vaccine: "Rabies",
      dateGiven: "2025-10-20",
      nextDueDate: "2026-10-20",
    },
  ]);
  await Bill.create({
    appointment: previous._id,
    consultation: record._id,
    pet: milo._id,
    owner: owner._id,
    items: [
      {
        name: "Consultation service fee",
        quantity: 1,
        unitPrice: 500,
        amount: 500,
      },
      { name: med.name, quantity: 14, unitPrice: 25, amount: 350 },
    ],
    total: 850,
    status: "Paid",
    paymentMethod: "Cash",
    paidAt: "2026-10-13",
  });
  await Expense.create([
    { category: "Clinic rent", amount: 12000, date: "2026-10-01" },
    { category: "Medical supplies", amount: 4000, date: "2026-10-06" },
    { category: "Utilities", amount: 2000, date: "2026-10-10" },
  ]);
  await Notification.create([
    {
      owner: owner._id,
      pet: milo._id,
      appointment: visit._id,
      title: "Appointment approved",
      message: `Milo’s consultation is approved for ${date} at 14:00 with Dr. Elena Cruz.`,
    },
    {
      owner: owner._id,
      pet: cleo._id,
      title: "Vaccination due reminder",
      message: "Cleo · Rabies · Due 20 Oct 2026",
      dueAt: "2026-10-20",
    },
  ]);
  console.log(
    "Seed complete. Owner: ava@furpaws.test · Admin: admin@furpaws.test · Password: FurPaws123",
  );
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
