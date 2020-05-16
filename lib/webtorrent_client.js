const WebTorrent = require("webtorrent");
const { promisify } = require("util");
const ip = require("ip");
const globby = require("globby");
const eachLimit = require("async/eachLimit");
const torrentDownDebug = require("debug")("torrent:leech");
const torrentUpDebug = require("debug")("torrent:seed");
const clientDebug = require("debug")("torrent:client");
const streamDebug = require("debug")("torrent:stream");
const CONCURRENCY_LIMIT = 5;
const { getStreamPort } = require("../config");

const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

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
  const destroyClient = promisify(client.destroy.bind(client));
  initClient({ client, downloadPath, filePath });

  return {
    shutdown: async function () {
      try {
        if (server) await closeServer(server);
        await destroyClient();
        clientDebug(`Client closes`);
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
    createServer: async (torrentId) => {
      if (server) await closeServer(server);

      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");

      return new Promise((resolve, reject) => {
        const port = getStreamPort();
        const host = ip.address();
        const files = torrent.files.map(fileInfo);

        server = torrent.createServer();
        server.listen(port, host, function (err) {
          if (err) reject(err);
          streamDebug(
            `Start stream server for "${torrent.name}" @ ${host}:${port}`
          );
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
    getTorrent: function (id) {
      return torrentInfo(client.get(id));
    },
    getTorrentFileFolder: function () {
      return filePath;
    },
    getDownloadFolder: function () {
      return downloadPath;
    },
    addTorrent: function (fileName) {
      return addTorrent({
        downloadPath,
        file: `${filePath}/${fileName}`,
        client,
      }).then((torrent) => torrentInfo(torrent));
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
  streamDebug(`Close stream server`);
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
}

function addTorrent({ downloadPath, client, file }) {
  let torrent;
  if ((torrent = checkTorrentIsAdded(file, client.torrents))) {
    return Promise.resolve(torrent);
  }

  return new Promise((resolve) => {
    client.add(file, { path: downloadPath }, function onTorrent(torrent) {
      torrentDownDebug(`Torrent ready to be used: ${torrent.name}`);

      torrent.on(
        "download",
        throttle(function () {
          const { downloadSpeed, progress, name } = torrent;
          torrentDownDebug(
            `Name: ${name}, downspeed: ${downloadSpeed}, progress: ${progress}`
          );
        }, 2000)
      );

      torrent.on(
        "upload",
        throttle(function () {
          const { uploadSpeed, name, ratio } = torrent;
          torrentUpDebug(
            `Name: ${name}, upspeed: ${uploadSpeed}, ratio: ${ratio}`
          );
        }, 2000)
      );

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
function checkTorrentIsAdded(file = "", torrents = []) {
  const pattern = /\[nCore\]\[.*\](.*).torrent/gm;
  const match = pattern.exec(file);

  if (torrents.length === 0 || !match) return false;
  const name = match.pop();
  return torrents.find(({ name: torrentName }) => torrentName === name);
}
