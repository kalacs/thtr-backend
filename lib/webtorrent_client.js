const WebTorrent = require("webtorrent");
const chokidar = require("chokidar");
const { promisify } = require("util");
const ip = require("ip");

module.exports = ({ downloadPath, filePath }) => {
  const client = new WebTorrent();
  let server;
  const destroyClient = promisify(client.destroy.bind(client));

  // watch for new .torrent
  const watcher = chokidar.watch(filePath, { awaitWriteFinish: true });
  watcher.on("add", addTorrent);

  function addTorrent(file) {
    console.log(`Torrent file: ${file}`);
    client.add(file, { path: downloadPath }, function onTorrent(torrent) {
      console.log(`Torrent ready to be used`);

      torrent.on("ready", function() {});

      torrent.on("download", function(bytes) {
        //        console.log("download speed: " + torrent.downloadSpeed);
        //        console.log("progress: " + torrent.progress);
      });

      torrent.on("upload", function(bytes) {
        //        console.log("upload speed: " + torrent.uploadSpeed);
        //        console.log("progress: " + torrent.progress);
      });

      torrent.on("error", function(error) {
        console.log("torrent error", error);
      });
    });
  }

  return {
    shutdown: async function() {
      await watcher.close();
      await destroyClient();
      await closeServer(server);
      return true;
    },
    shutdownServer: function() {
      return closeServer(server);
    },
    shutdownClient: function() {
      return destroyClient();
    },
    getTorrents: function() {
      return client.torrents.map(torrentInfo);
    },
    createServer: async function(torrentId) {
      if (server) await closeServer(server);

      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");

      return new Promise((resolve, reject) => {
        const port = 8888;
        const host = ip.address();
        const files = torrent.files.map(fileInfo);

        server = torrent.createServer();
        server.listen(port, host, function(err) {
          if (err) reject(err);
          console.log("Start stream server");
          resolve({ host, port, files });
        });
      });
    },
    getMediaFileIndex: function(torrentId) {
      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");
      const files = torrent.files.map(fileInfo);

      return files.findIndex(byExtension(["mp4", "mkv", "avi", "webm"]));
    },
    getClientStat: function() {
      return clientInfo(client);
    }
  };
};

function torrentInfo({ name, infoHash, path }) {
  return { name, infoHash, path };
}

function fileInfo({ name, path, length, downloaded, progress }) {
  return { name, path, length, downloaded, progress };
}

function clientInfo({ ratio, downloadSpeed, uploadSpeed, progress }) {
  return { ratio, downloadSpeed, uploadSpeed, progress };
}

function byExtension(list) {
  return function({ name }) {
    const extension = name.split(".").pop();
    return list.includes(extension) && name.indexOf("sample") === -1;
  };
}
async function closeServer(server) {
  if (!server) return new Error("No server found");
  await promisify(server.close.bind(server))();
  server = null;
  return true;
}
