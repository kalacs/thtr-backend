// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const path = require("path");
const makeScraper = require("ncore-scraper");
const { promisify } = require("util");
const makeTorrentClient = require("./lib/webtorrent_client");

module.exports = function (config) {
  const {
    scraper: { username, password, type = "ncore" },
    torrentClient: { downloadFolder, torrentFolder, streamPort },
    backend: { host, port },
    cors: { origin = ["*"] },
  } = config;

  const scraper = makeScraper({
    username,
    password,
    type,
  });

  const client = makeTorrentClient({
    downloadPath: downloadFolder,
    filePath: torrentFolder,
    streamPort,
  });

  fastify.register(require("fastify-cors"), {
    origin,
  });

  fastify.register(require("./routes/torrent-client/torrents"), {
    client,
    scraper,
    config,
    prefix: "/torrents",
  });
  fastify.register(require("./routes/torrent-client/client"), {
    client,
    scraper,
    prefix: "/client",
  });
  fastify.register(require("./routes/scraper"), {
    client,
    scraper,
    prefix: "/scraper",
  });

  fastify.ready(() => {
    console.log(fastify.printRoutes());
  });

  return {
    start: async function () {
      try {
        await promisify(fastify.listen.bind(fastify))(port, host);
        fastify.log.info(
          `server listening on ${fastify.server.address().port}`
        );
      } catch (error) {
        fastify.log.error(error);
      } finally {
        return true;
      }
    },
    stop: function () {
      return Promise.all([fastify.close(), client.shutdown()]);
    },
  };
};
