const makeApplication = require("./index");
const config = require("./config.json");
const app = makeApplication(config);
const pEvent = require("p-event");
app.start();

(async () => {
  await pEvent(process, "SIGINT");
  await app.stop();
  process.exit(0);
})();
