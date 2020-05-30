// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const path = require("path");
const { promisify } = require("util");
const { fork } = require("child_process");
const makeScraper = require("ncore-scraper");
const makeDLNACast = require("./lib/dlna");

module.exports = function (config) {
  const {
    scraper: { username, password, type = "ncore" },
    torrentClient: { downloadFolder, torrentFolder },
    streamServer,
    backend: { host, port },
    cors: { origin = ["*"] },
  } = config;

  const torrentProcess = fork("./workers/torrent.js", [
    downloadFolder,
    torrentFolder,
  ]);
  const client = require("./workers/worker-proxy")(torrentProcess, [
    "shutdown",
    "stopTorrentClient",
    "getTorrents",
    "getMediaFileIndex",
    "getClientStat",
    "getTorrent",
    "getTorrentFileFolder",
    "addTorrent",
    "pauseAllSeedableTorrent",
    "resumeAllSeedableTorrent",
  ]);

  const streamServerProcess = fork("./workers/stream-server", [
    JSON.stringify(streamServer),
  ]);
  const streamServerService = require("./workers/worker-proxy")(
    streamServerProcess,
    ["streamerShutdown", "start", "stop"]
  );

  const scraper = makeScraper({
    username,
    password,
    type,
  });

  const dlna = makeDLNACast();
  dlna.startSearch();

  fastify.register(require("fastify-cors"), {
    origin,
  });

  fastify.register(require("./routes/torrent-client/torrents"), {
    client,
    scraper,
    dlna,
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
  fastify.register(require("./routes/stream-server"), {
    streamServer: streamServerService,
    prefix: "/stream-server",
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
    stop: async function () {
      console.log("STOP START");
      await fastify.close();
      await dlna.shutdown();
      await client.shutdown();
      await streamServerService.streamerShutdown();
      console.log("SHUTDOWN FINISHED");
    },
  };
};
