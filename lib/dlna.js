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
    if (player) {
      media = player;
      media.on("error", function (err) {
        debug(`Player error: "${err.message}"`);
      });
      media.on("status", function (status) {
        debug(`Player status: "${status}"`);
      });
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
      await this.stop();
      media = null;
      return true;
    },
  };
};
