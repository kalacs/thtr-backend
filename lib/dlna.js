const dlnacasts = require("dlnacasts");
const { promisify } = require("util");
const MAX_RETRY = 10;

module.exports = function makeDlnaCast() {
  const lists = dlnacasts();
  let media;
  let searchInterval;
  let retry = 0;

  lists.on("update", function (player) {
    if (player) media = player;
  });

  return {
    startSearch: function () {
      searchInterval = setInterval(() => {
        console.log("Search dlna player");
        lists.update();

        if (media || retry === MAX_RETRY) {
          clearInterval(searchInterval);
          console.log(media);
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
      return new Promise((resolve, reject) => {
        if (!media) reject(new Error("Player not found!"));
        media.play(
          url,
          {
            title: "Movie",
          },
          function (err) {
            if (err) reject(err);
            resolve(url);
          }
        );
      });
    },
    stop() {
      if (!media.client) return Promise.resolve(true);
      return promisify(media.stop.bind(media))();
    },
  };
};
