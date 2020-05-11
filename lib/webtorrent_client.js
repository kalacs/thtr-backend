const WebTorrent = require("webtorrent");
const chokidar = require("chokidar");
const { promisify } = require("util");
const ip = require("ip");
const globby = require("globby");
const eachLimit = require("async/eachLimit");
const torrentDownDebug = require("debug")("torrent:leech");
const torrentUpDebug = require("debug")("torrent:seed");
const clientDebug = require("debug")("torrent:client");
const CONCURRENCY_LIMIT = 5;

module.exports = ({ downloadPath, filePath }) => {
  const client = new WebTorrent({
    dht: false,
    tracker: {
      announce: [
        "http://t.ncore.sh:2710/cc2b49f6937425b2b87003405cc46009/announce",
      ],
    },
  });
  client.on("error", function (error) {
    clientDebug(`Client error: ${error.message}`);
  });
  let server;
  let watcher;
  const destroyClient = promisify(client.destroy.bind(client));
  initClient({ client, downloadPath, filePath });
  // A. Init client
  // 1. add all torrents
  // 2. seed if downloaded
  // 3. watch for new torrents
  // watch for new .torrent
  /*
  const watcher = chokidar.watch(filePath, { awaitWriteFinish: true });
  watcher.on("add", addTorrent);
*/
  return {
    shutdown: async function () {
      try {
        if (watcher) await watcher.close();
        if (server) await closeServer(server);
        await destroyClient();
        return true;
      } catch (error) {
        clientDebug(`Error: ${error.message}`);
      }
    },
    shutdownServer: function () {
      return closeServer(server);
    },
    shutdownClient: function () {
      return destroyClient();
    },
    getTorrents: function () {
      return client.torrents.map(torrentInfo);
    },
    createServer: async function (torrentId) {
      if (server) await closeServer(server);

      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");

      return new Promise((resolve, reject) => {
        const port = 8888;
        const host = ip.address();
        const files = torrent.files.map(fileInfo);

        server = torrent.createServer();
        server.listen(port, host, function (err) {
          if (err) reject(err);
          console.log("Start stream server");
          resolve({ host, port, files });
        });
      });
    },
    getMediaFileIndex: function (torrentId) {
      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");
      const files = torrent.files.map(fileInfo);

      return files.findIndex(byExtension(["mp4", "mkv", "avi", "webm"]));
    },
    getClientStat: function () {
      return clientInfo(client);
    },
  };
};

function torrentInfo({
  name,
  infoHash,
  path,
  timeRemaining,
  received,
  downloaded,
  uploaded,
  downloadSpeed,
  uploadSpeed,
  progress,
  ratio,
}) {
  return {
    name,
    infoHash,
    path,
    timeRemaining,
    received,
    downloaded,
    uploaded,
    downloadSpeed,
    uploadSpeed,
    progress,
    ratio,
  };
}

const fileInfo = ({ name, path, length, downloaded, progress }) => ({
  name,
  path,
  length,
  downloaded,
  progress,
});

const clientInfo = ({ ratio, downloadSpeed, uploadSpeed, progress }) => ({
  ratio,
  downloadSpeed,
  uploadSpeed,
  progress,
});

function byExtension(list) {
  return function ({ name }) {
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
async function initClient({ downloadPath, filePath, client }) {
  // A. Init client
  // 1. add all torrents
  const torrents = await globby(`${filePath}/*.torrent`);
  const totalTorrents = torrents.length;
  clientDebug(`Total number of torrents: ${totalTorrents}`);
  eachLimit(
    torrents,
    CONCURRENCY_LIMIT,
    (file, cb) => {
      addTorrent({ downloadPath, client, file })
        .then((torrent) => {
          cb(null);
        })
        .catch((err) => cb(err));
    },
    function (err) {
      if (err) {
        console.log("A file failed to process", err);
      } else {
        console.log("All files have been processed successfully");
      }
    }
  );
  //  torrents.map((file) => addTorrent({ downloadPath, client, file }));
  // 2. seed if downloaded (deprecated)
  // 3. watch for new torrents
}

function addTorrent({ downloadPath, client, file }) {
  return new Promise((resolve) => {
    client.add(file, { path: downloadPath }, function onTorrent(torrent) {
      torrentDownDebug(`Torrent ready to be used: ${torrent.name}`);

      torrent.on("download", function () {
        const { downloadSpeed, progress, name } = torrent;
        torrentDownDebug(
          `Name: ${name}, downspeed: ${downloadSpeed}, progress: ${progress}`
        );
      });

      torrent.on("upload", function () {
        const { uploadSpeed, name, ratio } = torrent;
        torrentUpDebug(
          `Name: ${name}, upspeed: ${uploadSpeed}, ratio: ${ratio}`
        );
      });

      torrent.on("error", function (error) {
        console.log("torrent error", error);
      });

      torrent.on("done", function () {
        torrentUpDebug(`Torrent downloaded, start seeding: ${torrent.name}`);
      });
      torrent.on("warning", function (err) {
        torrentDownDebug(
          `Warning for torrent: ${torrent.name}, ${err.message}`
        );
      });
      resolve(torrent);
    });
  });
}
