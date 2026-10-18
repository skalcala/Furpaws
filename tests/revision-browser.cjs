const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs");
require("dotenv").config({ path: require("path").join(__dirname, "../server/.env") });
const mongoose = require("mongoose");
const root = process.env.APP_URL || "http://127.0.0.1:3000";
const output = process.env.BROWSER_OUTPUT || ".local/revision-browser";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : process.platform === "darwin"
        ? {
            executablePath:
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }
        : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1000 },
  });
  const errors = [];
  const created = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const login = async (email) => {
    await page.goto(`${root}/login`);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("FurPaws123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/(owner\/U1|admin\/A1)/);
  };
  const get = async (path) =>
    page.evaluate(async (path) => {
      const response = await fetch(`/api${path}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("furpawsToken")}`,
        },
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      return response.json();
    }, path);
  const margin = async (expected) => {
    const geometry = await page.locator(".app").evaluate((element) => {
      const { left, right } = element.getBoundingClientRect();
      return {
        left,
        right: innerWidth - right,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.ok(
      Math.abs(geometry.left - geometry.right) < 1,
      JSON.stringify(geometry),
    );
    assert.ok(Math.abs(geometry.left - expected) < 1, JSON.stringify(geometry));
    assert.equal(geometry.overflow, false);
  };
  const nextSlot = async (exclude) => {
    for (let offset = 40; offset < 90; offset++) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + offset);
      const date = day.toISOString().slice(0, 10);
      const { slots } = await get(`/appointments/slots?date=${date}`);
      const available = slots.find(
        ({ time, status }) =>
          status === "Available" && `${date}:${time}` !== exclude,
      );
      if (available) return { date, time: available.time };
    }
    throw new Error("No test slot available.");
  };
  const explanation =
    "Sneezing started three days ago. Appetite is lower than usual.\nNo medicine has been given. Please check breathing and temperature.";
  try {
    await login("ava@furpaws.test");
    await margin(0);
    for (const [width, gutter] of [
      [1440, 0],
      [1024, 0],
      [390, 0],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await margin(gutter);
    }
    await page.setViewportSize({ width: 1536, height: 1000 });
    await page.screenshot({
      path: `${output}/owner-dashboard.png`,
      fullPage: true,
    });
    const pets = await get("/pets");
    const services = await get("/services");
    const slot = await nextSlot();
    const service = services.find(({ name }) => name === "Consultation");
    const followup = services.find(({ name }) => /follow[ -]?up/i.test(name));
    const vaccine = services.find(({ type }) => type === "Vaccination");
    const draft = {
      bookingType: "With record",
      pet: pets[0]._id,
      registration: {},
      ...slot,
      service: service._id,
      reasonForVisit: "",
    };
    await page.evaluate(
      (draft) => sessionStorage.setItem("furpawsDraft", JSON.stringify(draft)),
      draft,
    );
    await page.goto(`${root}/owner/book-appointment/schedule`);
    await page.locator("#reasonForVisit").waitFor();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByText(
        "Please give a detailed explanation using 20–2,000 characters.",
        { exact: true },
      )
      .waitFor();
    assert.ok(page.url().endsWith("/owner/book-appointment/schedule"));
    await page.locator("#reasonForVisit").fill(explanation);
    await page.screenshot({
      path: `${output}/consultation-symptoms.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL("**/owner/book-appointment/review");
    await page.getByText(explanation, { exact: true }).waitFor();
    const response = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/appointments") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Submit Appointment", exact: true })
      .click();
    const saved = await (await response).json();
    assert.ok(saved._id);
    created.push(saved._id);
    assert.equal(saved.reasonForVisit, explanation);
    await page.waitForURL("**/owner/book-appointment/confirmation");
    await page.getByText(explanation, { exact: true }).waitFor();
    console.log(
      "Consultation: required details, review, persistence, and confirmation passed.",
    );
    // Follow-up uses the same validation with guidance for the prior treatment and progress.
    const followupSlot = await nextSlot(`${slot.date}:${slot.time}`);
    await page.evaluate(
      (draft) => sessionStorage.setItem("furpawsDraft", JSON.stringify(draft)),
      { ...draft, ...followupSlot, service: followup._id },
    );
    await page.goto(`${root}/owner/book-appointment/schedule`);
    await page
      .getByText("Follow-up details and current symptoms", { exact: false })
      .waitFor();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByText(
        "Please give a detailed explanation using 20–2,000 characters.",
        { exact: true },
      )
      .waitFor();
    const progress =
      "Follow-up after the last visit: appetite has improved, but sneezing continues in the morning. Please review treatment progress.";
    await page.locator("#reasonForVisit").fill(progress);
    await page.screenshot({
      path: `${output}/followup-details.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL("**/owner/book-appointment/review");
    await page.getByText(progress, { exact: true }).waitFor();
    const followupResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/appointments") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Submit Appointment", exact: true })
      .click();
    const savedFollowup = await (await followupResponse).json();
    assert.ok(savedFollowup._id);
    created.push(savedFollowup._id);
    assert.equal(savedFollowup.reasonForVisit, progress);
    console.log(
      "Follow-up: required history, review, and persisted booking passed.",
    );
    await page.evaluate(
      (draft) => sessionStorage.setItem("furpawsDraft", JSON.stringify(draft)),
      { ...draft, service: vaccine._id },
    );
    await page.goto(`${root}/owner/book-appointment/schedule`);
    await page.locator("#service").waitFor();
    assert.equal(await page.locator("#reasonForVisit").count(), 0);
    for (const route of ["U1", "U2", "U3", "U4", "U9", "U10"]) {
      await page.goto(`${root}/owner/${route}`);
      await page.locator("h1").waitFor();
      await margin(0);
    }
    await page.evaluate(() => sessionStorage.clear());
    await login("admin@furpaws.test");
    await margin(0);
    for (const route of [
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
    ]) {
      await page.goto(`${root}/admin/${route}`);
      await page.locator("h1").waitFor();
      await margin(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await margin(0);
    await page.setViewportSize({ width: 1536, height: 1000 });
    await page.goto(`${root}/admin/approvals/${saved._id}`);
    await page.getByText(explanation, { exact: true }).waitFor();
    await page.screenshot({
      path: `${output}/admin-owner-explanation.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.waitForURL("**/admin/approvals");
    await page.goto(`${root}/admin/consultations/${saved._id}`);
    await page.getByText(explanation, { exact: true }).waitFor();
    await page.screenshot({
      path: `${output}/consultation-owner-history.png`,
      fullPage: true,
    });
    console.log(
      "Owner explanation visible in Admin approval and consultation; full-width layout across 21 routes and mobile/tablet/desktop.",
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await mongoose.connect(process.env.MONGODB_URI);
    const { Appointment, Notification } = require("../server/models");
    await Notification.deleteMany({ appointment: { $in: created } });
    await Appointment.deleteMany({ _id: { $in: created } });
    await mongoose.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
