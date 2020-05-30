module.exports = function (f, { streamServer }, next) {
  f.post("/", async ({ body: { length, name, path, progress } }) => {
    await streamServer.stop();
    return streamServer.start({
      length,
      name,
      path,
      progress,
    });
  });
  f.delete("/", async () => {
    await streamServer.stop();
    return true;
  });

  next();
};
module.exports.autoPrefix = "/stream-server";
