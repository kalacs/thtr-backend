require("dotenv").config();
// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const AutoLoad = require("fastify-autoload");
const path = require("path");

const makeTorrentClient = require("./lib/webtorrent_client");
const makeScraper = require("ncore-scraper");

const SCRAPER_USERNAME = process.env.NCORE_NICK;
const SCRAPER_PASSWORD = process.env.NCORE_PASSHASH;
const CLIENT_DOWNLOAD_FOLDER = "downloads";
const CLIENT_TORRENT_FOLDER = "torrentFiles";

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
  origin: true,
});

fastify.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: { client, scraper },
});
fastify.ready(() => {
  console.log(fastify.printRoutes());
});

fastify.listen(3000, "192.168.0.124", function (err) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
});
process.on("SIGINT", function () {
  console.log("SIGITN");
  fastify.close();
  client.shutdown();
});
