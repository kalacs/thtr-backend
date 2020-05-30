const makeStreamServer = require("../lib/stream-server");
const pEvent = require("p-event");
const { argv } = process;

const service = makeStreamServer(JSON.parse(argv[2]));
console.log(`Stream server PID: ${process.pid}`);

(async () => {
  const asyncIterator = pEvent.iterator(process, "message", {
    resolutionEvents: ["close", "disconnect", "error", "exit"],
  });

  for await (const { command = "noop", params = [] } of asyncIterator) {
    console.log("RUN FUNC", command);
    const result = await service[command](...params);
    console.log("SEND RESULT BACK", { command, result });
    process.send({ command, result });
  }
})();
