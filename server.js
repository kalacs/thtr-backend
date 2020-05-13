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

fastify.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: { client, scraper },
});
fastify.ready(() => {
  console.log(fastify.printRoutes());
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
process.on("SIGINT", function () {
  fastify.close();
  client.shutdown();
});
start();
