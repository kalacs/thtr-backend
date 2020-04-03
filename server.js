// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const makeTorrentClient = require("./lib/webtorrent_client");
const makeDlnaCast = require("./dlna");

const client = makeTorrentClient({
  downloadPath: "downloads",
  filePath: "torrentFiles"
});

// Declare a route
fastify.get("/torrents", async (request, reply) => {
  return client.getTorrents();
});

fastify.get(
  "/torrents/:torrentId/server",
  async ({ params: { torrentId } }) => {
    return client.createServer(torrentId);
  }
);

fastify.get(
  "/torrents/:torrentId/dlnacast",
  async ({ params: { torrentId } }) => {
    const dlna = makeDlnaCast();
    const index = client.getMediaFileIndex(torrentId);
    return dlna.play({ url: `http://192.168.0.124:8888/${index}` });
  }
);

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
process.on("SIGINT", function() {
  fastify.close();
  client.shutdown();
});
start();
