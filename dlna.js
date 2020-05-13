var dlnacasts = require("dlnacasts");

module.exports = function makeDlnaCast() {
  const lists = dlnacasts();

  return {
    play: function ({ url }) {
      console.log("PLAY URL", url);
      return new Promise((resolve, reject) => {
        console.log("PROMISE");
        const searchInterval = setInterval(lists.update.bind(lists), 1000);

        lists.on("update", function (player) {
          clearInterval(searchInterval);
          console.log(player);
          console.log(url);
          player.play(
            url,
            {
              title: "my video",
            },
            function (err) {
              if (err) reject(err);
              resolve(url);
            }
          );
        });
      });
    },
  };
};
