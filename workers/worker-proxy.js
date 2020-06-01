const pEvent = require("p-event");

module.exports = (childProcess, validFunctions) => {
  return new Proxy(
    {},
    {
      get: function (target, prop, receiver) {
        if (!validFunctions.includes(prop)) throw new Error("Method not found");

        return async function () {
          childProcess.send({ command: prop, params: [...arguments] });

          const asyncIterator = pEvent.iterator(childProcess, "message", {
            resolutionEvents: ["close", "disconnect", "error", "exit"],
          });

          for await (const { command, result, error } of asyncIterator) {
            if (command === prop) return result;
          }
          return;
        };
      },
    }
  );
};
