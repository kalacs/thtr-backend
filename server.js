// Require the framework and instantiate it
const fastify = require("fastify")({ logger: true });
const AutoLoad = require("fastify-autoload");
const path = require("path");

const makeTorrentClient = require("./lib/webtorrent_client");

const client = makeTorrentClient({
  downloadPath: "downloads",
  filePath: "torrentFiles",
});

fastify.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: { client },
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
