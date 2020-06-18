const makeApplication = require("./index");
const defaultConfig = require("./default.config.json");
const userConfig = require("./config.json");
const config = require("./utils/config")(defaultConfig, userConfig);
const app = makeApplication(config);
const pEvent = require("p-event");
app.start();

(async () => {
  await pEvent(process, "SIGINT");
  await app.stop();
  process.exit(0);
})();
