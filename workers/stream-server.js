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
    const result = await service[command](...params);
    process.send({ command, result });
  }
})();
