const makeTorrentClient = require("./lib/webtorrent_client");

(function main() {
  const client = makeTorrentClient({
    downloadPath: "downloads",
    filePath: "torrentFiles"
  });

  // A. get torrents list X
  // 1. return torrent name and id X

  // B. create server for torrent
  // 1. get torrent by id X
  // 2. stop previous server
  // 3. start new server on network ip
  // 4. find video file index

  // C. start dlnacast for torrent
  // 1. find player
  // 2. play video file

  process.on("SIGINT", client.shutdown);
})();
