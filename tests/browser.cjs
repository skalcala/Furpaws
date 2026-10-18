const { chromium } = require("playwright");
const fs = require("fs");
const output = process.env.BROWSER_OUTPUT || ".local/browser-results";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : process.platform === "darwin"
        ? {
            executablePath:
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }
        : {}),
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const failures = [];
  const petName = `Browser Test Luna ${Date.now()}`;
  page.on("pageerror", (error) => failures.push(error.message));
  const login = async (email) => {
    await page.goto("http://127.0.0.1:3000/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("FurPaws123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/(owner\/U1|admin\/A1)/);
  };
  await login("ava@furpaws.test");
  await page
    .getByRole("link", { name: "Book Appointment", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /No record Register/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Pet name", { exact: true }).fill(petName);
  await page.getByLabel("Breed", { exact: true }).fill("Domestic shorthair");
  await page.getByLabel("Date of birth", { exact: true }).fill("2025-02-10");
  await page.getByLabel("Weight (kg)", { exact: true }).fill("3.6");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.locator(".calendar-day.available").first().click();
  await page.locator("#service").click();
  await page.getByText("Consultation", { exact: true }).last().click();
  await page
    .locator("#reasonForVisit")
    .fill(
      "My pet has been scratching for two days and is eating less than usual. No medicine has been given yet.",
    );
  await page
    .locator(".schedule-columns .panel")
    .last()
    .locator("button:not([disabled])")
    .first()
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit Appointment", exact: true })
    .click();
  await page.waitForURL("**/owner/U8");
  console.log("Owner booking completed");
  await page.screenshot({
    path: `${output}/flow-confirmation.png`,
    fullPage: true,
  });
  const ownerToken = await page.evaluate(() =>
    sessionStorage.getItem("furpawsToken"),
  );
  const appointments = await (
    await fetch("http://127.0.0.1:4000/api/appointments", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
  ).json();
  const appointment = appointments.find(
    ({ pet }) => pet?.name === petName && pet.status === "Pending",
  );
  if (!appointment) throw new Error("Pending booking missing");
  await page.evaluate(() => sessionStorage.clear());
  await login("admin@furpaws.test");
  await page.goto("http://127.0.0.1:3000/admin/A2");
  await page
    .getByRole("row")
    .filter({ hasText: petName })
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByRole("button", { name: "Send Decline", exact: true }).click();
  await page
    .getByText("Decline reason is required.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: `${output}/flow-decline-error.png`,
    fullPage: true,
  });
  await page
    .locator(".ant-modal")
    .filter({ hasText: "Decline appointment" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.waitForTimeout(600);
  console.log("Admin approval and required reason verified");
  await page.goto(`http://127.0.0.1:3000/admin/A5/${appointment._id}`);
  await page.locator("#weight").fill("4.1");
  await page.locator("#diagnosis").fill("Routine wellness exam");
  await page.locator("#symptoms").fill("Routine checkup");
  await page.locator("#prescription").fill("N/A");
  await page.locator("#medicine").click();
  await page
    .getByText(/Carprofen 25 mg · 0 tablets/)
    .last()
    .click();
  await page.getByText("Medicine Out of Stock", { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/flow-stock-error.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Select another medicine", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save and Complete", exact: true })
    .click();
  await page.waitForURL("**/admin/A11");
  console.log("Consultation completion and automatic billing verified");
  await page.screenshot({ path: `${output}/flow-bill.png`, fullPage: true });
  const adminToken = await page.evaluate(() =>
    sessionStorage.getItem("furpawsToken"),
  );
  const bills = await (
    await fetch("http://127.0.0.1:4000/api/bills", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  ).json();
  if (!bills.some(({ appointment: visit }) => visit?._id === appointment._id))
    throw new Error("Bill missing");
  await page.evaluate(() => sessionStorage.clear());
  await login("ava@furpaws.test");
  await page.goto(`http://127.0.0.1:3000/owner/U3c/${appointment.pet._id}`);
  await page.getByText("Routine wellness exam", { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/flow-owner-records.png`,
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      failures,
      booking: appointment._id,
      pet: appointment.pet._id,
    }),
  );
  await browser.close();
  if (failures.length) process.exitCode = 1;
})();
