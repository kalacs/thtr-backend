const makeApplication = require("./index");
const userConfig = require("./config.json");
const app = makeApplication(userConfig);
const pEvent = require("p-event");
app.start();

(async () => {
  await pEvent(process, "SIGINT");
  await app.stop();
  process.exit(0);
})();
