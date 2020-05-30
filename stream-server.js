const makeStreamServer = require("./lib/stream-server");

server = makeStreamServer({
  downloaded: 12528206016,
  length: 12528206016,
  name: "Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT.mkv",
  path:
    "downloads/Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT/Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT.mkv",
  progress: 1,
});
server.listen(8888, "192.168.0.124", function () {
  console.log("RUN");
});
