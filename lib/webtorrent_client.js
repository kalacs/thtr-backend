const WebTorrent = require("webtorrent");
const { promisify } = require("util");
const globby = require("globby");
const eachLimit = require("async/eachLimit");
const torrentDownDebug = require("debug")("torrent:leech");
const torrentUpDebug = require("debug")("torrent:seed");
const clientDebug = require("debug")("torrent:client");
const streamDebug = require("debug")("torrent:stream");
const ipAddressResolver = require("../utils/ip-address-resolver");
const CONCURRENCY_LIMIT = 5;

module.exports = ({
  downloadFolder: downloadPath,
  torrentFolder: filePath,
  streamServer,
}) => {
  let server;
  let client = new WebTorrent();
  client.on("error", function (error) {
    clientDebug(`Client error: ${error.message}`);
  });
  initClient({ client, downloadPath, filePath });

  return {
    async shutdown() {
      await this.stopStreamServer();
      await this.stopTorrentClient();
    },
    async stopStreamServer() {
      streamDebug(`Stopping stream server`);
      try {
        if (!server) return true;
        streamDebug(`Stream server have found`);
        await promisify(server.close.bind(server))();
        streamDebug(`Stream server has stopped`);
      } catch (error) {
        streamDebug(`Error: ${error.message}`);
      } finally {
        server = null;
        return true;
      }
    },
    async stopTorrentClient() {
      clientDebug("Destroying client");

      if (client) {
        clientDebug("Remove torrent listeners");
        client.torrents.forEach((torrent) => {
          torrent.removeListener("download", onDownload(torrent));
          torrent.removeListener("upload", onUpload(torrent));
          torrent.removeListener("error", onTorrentError(torrent));
          torrent.removeListener("done", onDone(torrent));
          torrent.removeListener("warning", onWarning(torrent));
        });
        await promisify(client.destroy.bind(client))();
      }
      clientDebug("Client has destroy");
      client = null;
      return true;
    },
    getTorrents() {
      return client.torrents.map(torrentInfo);
    },
    startStreamServer(torrentId) {
      const torrent = client.get(torrentId);

      if (!torrent) throw new Error("Torrent not found!");

      const { port, host } = ipAddressResolver(streamServer.network);
      const files = torrent.files.map(fileInfo);

      server = torrent.createServer();
      return promisify(server.listen.bind(server))(port, host).then(() => ({
        host,
        port,
        files,
      }));
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
    pauseAllSeedableTorrent() {
      client.torrents.forEach((torrent) => {
        const { paused, done } = torrent;
        if (!done && !paused) {
          console.log("TORRENT PAUSE A", torrent.name);
          torrent.pause();
          console.log("TORRENT PAUSE B", torrent.paused);
        }
      });
    },
    resumeAllSeedableTorrent() {
      client.torrents.forEach((torrent) => {
        const { paused, done } = torrent;
        if (!done && paused) {
          console.log("TORRENT RESUME", torrent.name);
          torrent.resume();
          console.log("TORRENT REMUSE", torrent.paused);
        }
      });
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
  done,
  paused,
  numPeers,
  maxWebConns,
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
    done,
    paused,
    numPeers,
    maxWebConns,
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
  return function ({ name, path }) {
    const extension = name.split(".").pop();
    return list.includes(extension) && path.indexOf("sample") === -1;
  };
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
        .then(() => {
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
    clientDebug("Torrent has already added");
    const { paused } = torrent;
    if (paused) torrent.resume();
    return Promise.resolve(torrent);
  }

  return new Promise((resolve) => {
    client.add(file, { path: downloadPath }, function onTorrent(torrent) {
      torrentDownDebug(`Torrent ready to be used: ${torrent.name}`);

      torrent.on("download", onDownload(torrent));
      torrent.on("upload", onUpload(torrent));
      torrent.on("error", onTorrentError(torrent));
      torrent.on("done", onDone(torrent));
      torrent.on("warning", onWarning(torrent));
      resolve(torrent);
    });
  });
}

function onDownload(torrent) {
  return function () {
    const { downloadSpeed, progress, name, downloaded } = torrent;
    torrentDownDebug(
      `Name: ${name}, downspeed: ${downloadSpeed / 125000} Mbps, downloaded: ${
        downloaded / 125000
      } Mbps`
    );
  };
}

function onUpload(torrent) {
  return function () {
    const { uploadSpeed, name, ratio } = torrent;
    torrentUpDebug(`Name: ${name}, upspeed: ${uploadSpeed}, ratio: ${ratio}`);
  };
}

function onTorrentError(torrent) {
  return (error) => {
    console.log("torrent error", error);
  };
}

function onDone(torrent) {
  return () => {
    torrentUpDebug(`Torrent downloaded, start seeding: ${torrent.name}`);
  };
}

function onWarning(torrent) {
  return (err) => {
    torrentDownDebug(`Warning for torrent: ${torrent.name}, ${err.message}`);
  };
}

function checkTorrentIsAdded(file = "", torrents = []) {
  const pattern = /\[nCore\]\[.*\](.*).torrent/gm;
  const match = pattern.exec(file);

  if (torrents.length === 0 || !match) return false;
  const name = match.pop();
  return torrents.find(({ name: torrentName }) => torrentName === name);
}
