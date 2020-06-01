const makeStreamServer = require("./lib/stream-server");

server = makeStreamServer({ host: "192.168.0.124", port: 8888 });
(async () => {
  await server.start({
    downloaded: 12528206016,
    length: 12528206016,
    name: "Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT.mkv",
    path:
      "downloads/Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT/Sonic.The.Hedgehog.2020.1080p.BluRay.x264.TrueHD.7.1.Atmos-FGT.mkv",
    progress: 1,
  });

  setTimeout(async () => {
    console.log("Closing");

    //  sockets.forEach((socket) => {
    //    socket.destroy();
    //  });
    //  server.removeListener("connection", onConnection);
    await server.streamerShutdown();
  }, 10000);

  setTimeout(() => {
    console.log("END");
  }, 30000000);
})();
