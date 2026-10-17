const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const mongoose = require("mongoose");
async function start() {
  const directory = path.resolve(".local/mongo");
  fs.mkdirSync(directory, { recursive: true });
  const probe = await mongoose
    .createConnection("mongodb://127.0.0.1:27018/?directConnection=true", {
      serverSelectionTimeoutMS: 1000,
    })
    .asPromise()
    .catch(() => null);
  if (probe) await probe.close();
  else {
    const result = spawnSync(
      "mongod",
      [
        "--dbpath",
        directory,
        "--port",
        "27018",
        "--replSet",
        "rs0",
        "--bind_ip",
        "127.0.0.1",
        "--logpath",
        path.resolve(".local/mongod.log"),
        "--fork",
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0)
      throw new Error(
        "Install MongoDB Community Server (mongod) and retry, or use a MongoDB Atlas replica-set URI.",
      );
  }
  const connection = await mongoose
    .createConnection("mongodb://127.0.0.1:27018/?directConnection=true")
    .asPromise();
  try {
    await connection.db
      .admin()
      .command({
        replSetInitiate: {
          _id: "rs0",
          members: [{ _id: 0, host: "127.0.0.1:27018" }],
        },
      });
  } catch (error) {
    if (error.codeName !== "AlreadyInitialized") throw error;
  } finally {
    await connection.close();
  }
  const ready = await mongoose
    .createConnection("mongodb://127.0.0.1:27018/furpaws?replicaSet=rs0", {
      serverSelectionTimeoutMS: 30000,
    })
    .asPromise();
  await ready.close();
  console.log("Local MongoDB replica set is ready on 127.0.0.1:27018.");
}
start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
