const makeApplication = require("./index");
const config = require("./config.json");
const app = makeApplication(config);
app.start();

process.on("SIGINT", async function () {
  await app.stop();
});
