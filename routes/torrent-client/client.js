module.exports = function (f, { client }, next) {
  f.get("/", async () => client.getClientStat());

  next();
};
module.exports.autoPrefix = "/client";
