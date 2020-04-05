const WebTorrent = require("webtorrent");
const chokidar = require("chokidar");
const { promisify } = require("util");
const ip = require("ip");
const globby = require("globby");
const torrentDownDebug = require("debug")("torrent:leech");
const torrentUpDebug = require("debug")("torrent:seed");
const clientDebug = require("debug")("torrent:client");

module.exports = ({ downloadPath, filePath }) => {
  const client = new WebTorrent();
  let server;
  const destroyClient = promisify(client.destroy.bind(client));

  initClient({ client, downloadPath, filePath });

  client.seed("downloads/Big Buck Bunny", function onSeed(torrent) {
    const { downloadSpeed, uploadSpeed, progress, name, ratio } = torrent;
    torrentUpDebug(`Start seeding: ${torrent.name}`);
    torrent.on("upload", function() {
      torrentUpDebug(`Name: ${name}, upspeed: ${uploadSpeed}, ratio: ${ratio}`);
    });
  });

  // A. Init client
  // 1. add all torrents
  // 2. seed if downloaded
  // 3. watch for new torrents
  // watch for new .torrent
  /*
  const watcher = chokidar.watch(filePath, { awaitWriteFinish: true });
  watcher.on("add", addTorrent);

  function addTorrent(file) {
    console.log(`Torrent file: ${file}`);
    client.add(file, { path: downloadPath }, function onTorrent(torrent) {
      torrentDownDebug(`Torrent ready to be used`);
      const { downloadSpeed, uploadSpeed, progress, name, ratio } = torrent;
      torrent.on("download", function() {
        torrentDownDebug(
          `Name: ${name}, downspeed: ${downloadSpeed}, progress: ${progress}`
        );
      });
      torrent.on("upload", function() {
        torrentUpDebug(
          `Name: ${name}, upspeed: ${uploadSpeed}, ratio: ${ratio}`
        );
      });

      torrent.on("error", function(error) {
        console.log("torrent error", error);
      });
    });
  }
*/
  return {
    shutdown: async function() {
      try {
        if (watcher) await watcher.close();
        if (server) await closeServer(server);
        await destroyClient();
        return true;
      } catch (error) {
        clientDebug(`Error: ${error.message}`);
      }
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
  ratio
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
    ratio
  };
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
async function initClient({ downloadPath, filePath, client }) {
  // A. Init client
  // 1. add all torrents
  const torrents = await globby(`${filePath}/*.torrent`);
  console.log(torrents);
  // 2. seed if downloaded
  // 3. watch for new torrents
}
