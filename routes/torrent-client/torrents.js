const makeDlnaCast = require("../../dlna");

module.exports = function (f, { client }, next) {
  // Declare a route
  f.get("/", async () => client.getTorrents());

  f.get("/:torrentId/server", ({ params: { torrentId } }) =>
    client.createServer(torrentId)
  );

  f.get("/:torrentId/dlnacast", async ({ params: { torrentId } }) => {
    const index = client.getMediaFileIndex(torrentId);
    const dlna = makeDlnaCast();

    try {
      const play = await dlna.play({
        url: `http://192.168.0.124:8888/${index}`,
      });
      return play;
    } catch (error) {
      console.log(error);
    }
  });

  next();
};
module.exports.autoPrefix = "/torrents";
