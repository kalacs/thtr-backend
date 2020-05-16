const makeTorrentClient = require("./lib/webtorrent_client");

(function main() {
  const client = makeTorrentClient({
    downloadPath: "downloads",
    filePath: "torrentFiles",
  });

  process.on("SIGINT", client.shutdown);
})();
