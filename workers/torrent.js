const makeTorrentClient = require("../lib/webtorrent_client");
const pEvent = require("p-event");
const { argv } = process;
console.log(JSON.parse(argv[2]));
const client = makeTorrentClient(JSON.parse(argv[2]));
console.log(`Torrent client PID: ${process.pid}`);

(async () => {
  const asyncIterator = pEvent.iterator(process, "message", {
    resolutionEvents: ["close", "disconnect", "error", "exit"],
  });

  for await (const { command = "noop", params = [] } of asyncIterator) {
    console.log("RUN FUNC", command);
    const result = await client[command](...params);
    console.log("SEND RESULT BACK", { command, result });
    process.send({ command, result });
  }
})();
