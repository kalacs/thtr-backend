const { pipeline } = require("stream");
const { createWriteStream } = require("fs");

module.exports = function (f, { client, scraper, dlna }, next) {
  // Declare a route
  f.get("/", async () => client.getTorrents());

  f.post("/", async ({ body: { id, type = "ncore" } }, reply) => {
    try {
      const stream = await scraper.getTorrentFile(id);
      const torrentFolder = await client.getTorrentFileFolder();
      const fileName = await new Promise((resolve, reject) => {
        client.pauseAllSeedableTorrent();
        stream.on("response", function (response) {
          const pattern = /filename="(.*)"/gm;
          const filenameHeader = response.headers["content-disposition"];
          const [, fileName] = pattern.exec(filenameHeader);

          pipeline(
            stream,
            createWriteStream(`${torrentFolder}/${fileName}`),
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

  f.get("/:torrentId", async ({ params: { torrentId } }) =>
    client.getTorrent(torrentId)
  );

  f.get("/:torrentId/server", async ({ params: { torrentId } }) => {
    try {
      await Promise.all([dlna.stop(), client.stopStreamServer()]);
      const serverData = await client.startStreamServer(torrentId);
      const index = await client.getMediaFileIndex(torrentId);
      const { host, port } = serverData;
      serverData.url = `${host}:${port}/${index}`;
      return serverData;
    } catch (error) {
      console.log(error);
      return error;
    }
  });
  // TODO: move out to dlna routes
  f.post("/dlnacast", async ({ body: { url } }) => dlna.play(url));
  f.delete("/dlnacast", async () => dlna.stop());

  next();
};
module.exports.autoPrefix = "/torrents";
