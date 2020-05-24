const { pipeline } = require("stream");
const { createWriteStream } = require("fs");

module.exports = function (f, { client, scraper, config, dlna }, next) {
  // Declare a route
  f.get("/", async () => client.getTorrents());

  f.get("/:torrentId", async ({ params: { torrentId } }) =>
    client.getTorrent(torrentId)
  );

  f.get("/:torrentId/server", async ({ params: { torrentId } }) => {
    try {
      await Promise.all([dlna.stop(), client.stopStreamServer()]);
      const serverData = await client.startStreamServer(torrentId);
      const index = client.getMediaFileIndex(torrentId);
      const { host, port } = serverData;
      serverData.url = `${host}:${port}/${index}`;
      return serverData;
    } catch (error) {
      console.log(error);
      return error;
    }
  });

  f.get("/:torrentId/dlnacast", ({ params: { torrentId } }) => {
    const index = client.getMediaFileIndex(torrentId);
    return dlna.play(
      `http://${config.backend.host}:${config.torrentClient.streamPort}/${index}`
    );
  });

  f.post("/", async ({ body: { id, type = "ncore" } }, reply) => {
    try {
      const stream = await scraper.getTorrentFile(id);
      const fileName = await new Promise((resolve, reject) => {
        client.pauseAllSeedableTorrent();
        stream.on("response", function (response) {
          const pattern = /filename="(.*)"/gm;
          const filenameHeader = response.headers["content-disposition"];
          const [, fileName] = pattern.exec(filenameHeader);

          pipeline(
            stream,
            createWriteStream(`${client.getTorrentFileFolder()}/${fileName}`),
            (err) => {
              if (err) reject(err);
              resolve(fileName);
            }
          );
        });
      });
      return client.addTorrent(fileName);
    } catch (error) {
      client.resumeAllSeedableTorrent();
      reply.code(400).send(error.message);
    }
  });

  next();
};
module.exports.autoPrefix = "/torrents";
