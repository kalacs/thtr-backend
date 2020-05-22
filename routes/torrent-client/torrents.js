const { pipeline } = require("stream");
const { createWriteStream } = require("fs");

module.exports = function (f, { client, scraper, config, dlna }, next) {
  // Declare a route
  f.get("/", async () => client.getTorrents());

  f.get("/:torrentId", async ({ params: { torrentId } }) =>
    client.getTorrent(torrentId)
  );

  f.get("/:torrentId/server", async ({ params: { torrentId } }) => {
    const serverData = await client.createServer(torrentId);
    const index = client.getMediaFileIndex(torrentId);
    const { host, port } = serverData;
    return Object.assign({}, serverData, { url: `${host}:${port}/${index}` });
  });

  f.get("/:torrentId/dlnacast", async ({ params: { torrentId } }) => {
    const index = client.getMediaFileIndex(torrentId);
    try {
      const play = await dlna.play(
        `http://${config.backend.host}:${config.torrentClient.streamPort}/${index}`
      );
      return play;
    } catch (error) {
      console.log(error);
      return error;
    }
  });

  f.post("/", async ({ body: { id, type = "ncore" } }, reply) => {
    try {
      const stream = await scraper.getTorrentFile(id);
      const fileName = await new Promise((resolve, reject) => {
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
      reply.code(400).send(error.message);
    }
  });

  next();
};
module.exports.autoPrefix = "/torrents";
