module.exports = function (f, { streamServer }, next) {
  f.post("/", async ({ body: { length, name, path, progress } }) => {
    return streamServer.start({
      length,
      name,
      path,
      progress,
    });
  });
  f.delete("/", async () => {
    await streamServer.streamerShutdown();
    return true;
  });

  next();
};
module.exports.autoPrefix = "/stream-server";
