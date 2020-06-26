// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const path = require("path");
const { promisify } = require("util");
const { fork } = require("child_process");
const makeScraper = require("ncore-scraper");
const makeDLNACast = require("./lib/dlna");
const ipAddressResolver = require("./utils/ip-address-resolver");
const configureApp = require("./utils/config");
const defaultConfig = require("./default.config.json");

module.exports = function (userConfig) {
  const config = configureApp(defaultConfig, userConfig);
  const {
    torrentProviderService,
    torrentClientService,
    apiService: {
      network,
      cors: { origin = ["*"] },
    },
  } = config;

  const torrentProcess = fork(path.join(__dirname, "./workers/torrent.js"), [
    JSON.stringify(torrentClientService),
  ]);
  const client = require(path.join(
    __dirname,
    "./workers/worker-proxy"
  ))(torrentProcess, [
    "shutdown",
    "stopStreamServer",
    "stopTorrentClient",
    "getTorrents",
    "startStreamServer",
    "getMediaFileIndex",
    "getClientStat",
    "getTorrent",
    "getTorrentFileFolder",
    "addTorrent",
    "pauseAllSeedableTorrent",
    "resumeAllSeedableTorrent",
  ]);

  const scraper = makeScraper(torrentProviderService);
  const dlna = makeDLNACast();
  dlna.startSearch();

  fastify.register(require("fastify-cors"), {
    origin,
  });

  fastify.register(require("./routes/torrent-client/torrents"), {
    client,
    scraper,
    dlna,
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
        const { port, host } = ipAddressResolver(network);
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
    stop: async function () {
      console.log("STOP START");
      await fastify.close();
      await dlna.shutdown();
      await client.shutdown();
      console.log("SHUTDOWN FINISHED");
    },
  };
};
