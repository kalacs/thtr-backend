const dlnacasts = require("dlnacasts");
const { promisify } = require("util");
const debug = require("debug")("torrent:dlnacast");
const MAX_RETRY = 10;

module.exports = function makeDlnaCast() {
  const lists = dlnacasts();
  let media;
  let searchInterval;
  let retry = 0;

  lists.on("update", function (player) {
    debug("Update has been issued");
    if (player) {
      media = player;
      media.on("error", function (err) {
        debug(`Player error: "${err.message}"`);
      });
      if (media.client) {
        media.client.on("status", function (status) {
          debug(`Player status: "${JSON.stringify(status)}"`);
          console.log(status);
        });
      }
    }
  });

  return {
    startSearch: function () {
      searchInterval = setInterval(() => {
        debug("Search dlna player");
        lists.update();

        if (media || retry === MAX_RETRY) {
          clearInterval(searchInterval);
          if (media) debug(`Player has found ${media.name}`);
        }
        retry++;
      }, 1000);
      return MAX_RETRY;
    },
    stopSearch: function () {
      clearInterval(searchInterval);
      return true;
    },
    play: (url) => {
      debug("Starting dlnacast");
      return new Promise((resolve, reject) => {
        if (!media) reject(new Error("Player not found!"));
        media.play(
          url,
          {
            title: "Movie",
          },
          function (err) {
            if (err) reject(err);

            media.client.on("stopped", function () {
              if (media) media.stop();
              debug("Stop casting");
            });

            resolve(url);
          }
        );
      });
    },
    stop() {
      debug("Stopping dlnacast");
      if (!media || !media.client) return Promise.resolve(true);
      return promisify(media.stop.bind(media))();
    },
    async shutdown() {
      await this.stopSearch();
      await this.stop();
      if (media && media.client) {
        // hack
        const errorListeners = media.client.listeners("error");
        const statusListeners = media.client.listeners("status");
        const loadingListeners = media.client.listeners("loading");
        const closeListeners = media.client.listeners("close");
        const stoppedListeners = media.client.listeners("stopped");
        errorListeners.forEach((listener) => {
          media.client.removeListener("error", listener);
        });
        statusListeners.forEach((listener) => {
          media.client.removeListener("status", listener);
        });
        loadingListeners.forEach((listener) => {
          media.client.removeListener("loading", listener);
        });
        closeListeners.forEach((listener) => {
          media.client.removeListener("close", listener);
        });
        stoppedListeners.forEach((listener) => {
          media.client.removeListener("stopped", listener);
        });
      }
      media = null;
      return true;
    },
  };
};
