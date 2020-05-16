require("dotenv").config();
// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const AutoLoad = require("fastify-autoload");
const path = require("path");
const {
  getNcoreNick,
  getNcorePasshash,
  getAPIHost,
  getAPIPort,
  getFrontendUrl,
  getDownloadFolder,
  getTorrentFilesFolder,
} = require("./config");

const makeTorrentClient = require("./lib/webtorrent_client");
const makeScraper = require("ncore-scraper");

const SCRAPER_USERNAME = getNcoreNick();
const SCRAPER_PASSWORD = getNcorePasshash();
const CLIENT_DOWNLOAD_FOLDER = getDownloadFolder();
const CLIENT_TORRENT_FOLDER = getTorrentFilesFolder();

const scraper = makeScraper({
  username: SCRAPER_USERNAME,
  password: SCRAPER_PASSWORD,
  type: "ncore",
});

const client = makeTorrentClient({
  downloadPath: CLIENT_DOWNLOAD_FOLDER,
  filePath: CLIENT_TORRENT_FOLDER,
});

fastify.register(require("fastify-cors"), {
  origin: [getFrontendUrl()],
});

fastify.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: { client, scraper },
});
fastify.ready(() => {
  console.log(fastify.printRoutes());
});

fastify.listen(getAPIPort(), getAPIHost(), function (err) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
});
process.on("SIGINT", function () {
  fastify.close();
  client.shutdown();
});
