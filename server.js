const makeApplication = require("./index");
const config = require("./config.json");
const app = makeApplication(config);
app.start();
