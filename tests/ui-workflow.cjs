process.chdir(require("path").resolve(__dirname, ".."));
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const { MongoClient } = require("mongoose").mongo;
const database = "furpaws_ui_revision_" + Date.now(),
  port = Number(process.env.TEST_PORT || 4502),
  root = "http://127.0.0.1:" + port;
const env = {
  ...process.env,
  MONGODB_URI: `mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`,
  JWT_SECRET: "isolated-browser-test-secret-only",
  PORT: String(port),
  CLIENT_ORIGIN: root,
  TWILIO_ACCOUNT_SID: "",
  TWILIO_AUTH_TOKEN: "",
  TWILIO_VERIFY_SERVICE_SID: "",
};
delete env.VERCEL;
(async () => {
  let server, browser;
  fs.mkdirSync(".local/screenshot-revision", { recursive: true });
  try {
    const seed = spawnSync(process.execPath, ["server/seed.js"], {
      env,
      stdio: "pipe",
    });
    if (seed.status) throw Error("Isolated seed failed");
    server = spawn(process.execPath, ["server/server.js"], {
      env,
      stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(root + "/api/health")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    browser = await chromium.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const login = async (identifier) => {
      await page.goto(root + "/login");
      await page
        .getByLabel("Email or mobile number", { exact: true })
        .fill(identifier);
      await page.getByLabel("Password", { exact: true }).fill("FurPaws123");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL(/\/(owner\/U1|admin\/A1)/);
    };
    const get = (path) =>
      page.evaluate(async (path) => {
        const r = await fetch("/api" + path, {
          headers: {
            Authorization: "Bearer " + sessionStorage.getItem("furpawsToken"),
          },
        });
        if (!r.ok) throw Error("API " + r.status);
        return r.json();
      }, path);
    const shot = async (name) =>
      page.screenshot({
        path: ".local/screenshot-revision/" + name + ".png",
        fullPage: true,
        animations: "disabled",
      });
    try {
      // UI-only mock checks verification state; no real SMS or account creation.
      await page.route("**/api/auth/config", (route) =>
        route.fulfill({ json: { phoneOtpEnabled: true } }),
      );
      await page.route("**/api/auth/phone/send", (route) =>
        route.fulfill({ json: { message: "Sent", retryAfter: 60 } }),
      );
      await page.route("**/api/auth/phone/check", (route) =>
        route.fulfill({ json: { ticket: "ui-test-only-ticket" } }),
      );
      await page.goto(root + "/login?mode=register");
      await page
        .getByLabel("PH mobile number", { exact: true })
        .fill("09179999004");
      assert(
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .isDisabled(),
      );
      await page
        .getByRole("button", { name: "Send verification code", exact: true })
        .click();
      await page
        .getByLabel("SMS verification code", { exact: true })
        .fill("123456");
      await page
        .getByRole("button", { name: "Verify number", exact: true })
        .click();
      await page.getByText("Mobile number verified", { exact: true }).waitFor();
      assert(
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .isEnabled(),
      );
      await page
        .getByLabel("PH mobile number", { exact: true })
        .fill("09179999005");
      assert(
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .isDisabled(),
      );
      await page.unrouteAll({ behavior: "wait" });
      console.log("OTP UI state verified with mocked responses; no SMS sent.");
      await page.goto(root + "/login");
      await page
        .getByLabel("Email or mobile number", { exact: true })
        .waitFor();
      await shot("login");
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await shot("login-mobile");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await login("09175550142");
      const pets = await get("/pets");
      await page.goto(root + "/owner/pets/" + pets[0]._id);
      const uploaded = page.waitForResponse(
        (r) =>
          r.url().includes("/api/pets/") && r.request().method() === "PATCH",
      );
      await page
        .getByLabel("Choose pet photo", { exact: true })
        .setInputFiles("client/public/assets/imgPetPicture.png");
      assert.equal((await uploaded).status(), 200);
      await page.getByText("Pet information saved.", { exact: true }).waitFor();
      assert(
        (await get("/pets/" + pets[0]._id)).picture.startsWith(
          "data:image/webp;base64,",
        ),
      );
      await shot("owner-photo");
      console.log("Photo upload saved and persisted.");
      await page.goto(root + "/owner/book-appointment");
      await page.getByRole("button", { name: /No record.*Register/ }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByLabel("Pet name", { exact: true }).fill("Browser intake");
      await page
        .locator(".ant-select")
        .filter({ has: page.locator("#breed") })
        .click();
      await page.locator("#breed").fill("Aspin");
      await page
        .locator(".ant-select-item-option-content")
        .getByText("Aspin", { exact: true })
        .click();
      await page
        .getByLabel("Date of birth", { exact: true })
        .fill("2025-01-01");
      const weight = page.getByPlaceholder("Leave blank if unsure");
      await weight.pressSequentially("abc1e2-3");
      assert.equal(await weight.inputValue(), "123");
      await weight.fill("3.4");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.waitForURL("**/owner/book-appointment/schedule");
      await page
        .locator(".ant-select")
        .filter({ has: page.locator("#service") })
        .click();
      await page
        .locator(".ant-select-item-option-disabled")
        .getByText("Follow-up checkup", { exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      console.log(
        "Numeric field blocks letters; No record disables follow-up.",
      );
      await page.goto(root + "/owner/book-appointment");
      await page.getByRole("button", { name: /With record.*Select/ }).click();
      await page
        .getByRole("button", { name: "Select pet", exact: true })
        .first()
        .click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page
        .locator(".ant-select")
        .filter({ has: page.locator("#service") })
        .click();
      await page
        .locator(".ant-select-item-option-content")
        .getByText("Follow-up checkup", { exact: true })
        .click();
      await page
        .getByLabel("Follow-up notes (optional)", { exact: true })
        .waitFor();
      await shot("optional-followup");
      await page.evaluate(() => sessionStorage.clear());
      await login("admin@furpaws.test");
      await page.goto(root + "/admin/consultations");
      await page
        .getByRole("button", { name: "Emergency consultation", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByText("New pet / no account", { exact: true }).click();
      await dialog
        .getByLabel("Owner/contact name", { exact: true })
        .fill("Browser Guest Owner");
      await dialog
        .getByLabel("Pet name", { exact: true })
        .fill("Browser Emergency Patient");
      await dialog
        .locator(".ant-select")
        .filter({ has: page.locator("#species") })
        .click();
      await page
        .locator(".ant-select-item-option-content")
        .getByText("Other", { exact: true })
        .click();
      await dialog
        .getByLabel("Specify species", { exact: true })
        .fill("Rabbit");
      await dialog.getByLabel("Breed", { exact: true }).fill("Unknown");
      await dialog
        .getByLabel("Emergency concern", { exact: true })
        .fill("Urgent assessment requested for the classroom browser test.");
      await shot("emergency-intake");
      await dialog
        .getByRole("button", { name: "Start emergency visit", exact: true })
        .click();
      await page.waitForURL(/admin\/A5\/[^/]+$/);
      await page.getByPlaceholder("Measured at the clinic").waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "Prescriptions", exact: true })
          .count(),
        0,
      );
      await page.getByPlaceholder("Measured at the clinic").fill("1.5");
      await page.getByLabel(/^Diagnosis/).fill("Browser test assessment");
      await page
        .getByLabel(/^Treatment/)
        .fill("Observation and supportive care recorded for demo.");
      await page
        .getByRole("switch", {
          name: "Recommend a follow-up checkup",
          exact: true,
        })
        .check();
      const date = new Date(Date.now() + 5 * 86400000)
        .toISOString()
        .slice(0, 10);
      await page.getByLabel(/^Suggested checkup date/).fill(date);
      await page.getByLabel(/^Follow-up purpose/).fill("Recheck recovery");
      await page
        .getByLabel("Care instructions (optional)", { exact: true })
        .fill("Bring the visit record for review.");
      await shot("emergency-clinical");
      await page
        .getByRole("button", { name: "Save and Complete", exact: true })
        .click();
      await page.waitForURL("**/admin/billing-and-payments");
      await page.locator("#selected-bill").waitFor();
      await page
        .getByRole("button", { name: "Print Bill", exact: true })
        .waitFor();
      await page.goto(root + "/admin/consultations?tab=followups");
      await page
        .getByRole("cell", { name: "Browser Emergency Patient", exact: true })
        .waitFor();
      await page
        .getByRole("cell", { name: "Recheck recovery", exact: true })
        .waitFor();
      await shot("followup-history");
      assert.deepEqual(errors, []);
      console.log(
        "Emergency guest intake, clinical completion, unpaid service bill and saved follow-up history passed.",
      );
    } catch (e) {
      await shot("failure");
      console.log("Failed at", page.url());
      console.log((await page.locator("body").innerText()).slice(-2500));
      throw e;
    }
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
    const client = new MongoClient(env.MONGODB_URI);
    await client.connect();
    await client.db(database).dropDatabase();
    await client.close();
    console.log("Removed only the isolated browser database.");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
