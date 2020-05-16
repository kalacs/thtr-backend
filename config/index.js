module.exports = {
  getNcoreNick: () => process.env.NCORE_NICK,
  getNcorePasshash: () => process.env.NCORE_PASSHASH,
  getAPIHost: () => process.env.API_HOST,
  getAPIPort: () => process.env.API_PORT || 3000,
  getStreamPort: () => process.env.STREAM_PORT || 8888,
  getFrontendUrl: () => process.env.FRONTEND_URL,
  getDownloadFolder: () => process.env.DOWNLOAD_FOLDER || "downloads",
  getTorrentFilesFolder: () =>
    process.env.TORRENT_FILES_FOLDER || "torrentFiles",
};
