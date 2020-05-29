const makeTorrentClient = require("../lib/webtorrent_client");
const pEvent = require("p-event");
const { argv } = process;

const client = makeTorrentClient({
  downloadPath: argv[2],
  filePath: argv[3],
  streamPort: argv[4],
});
console.log("PID", process.pid);

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
