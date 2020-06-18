const { networkInterfaces } = require("os");

function getAddressOfInterface(interface) {
  const interfaces = networkInterfaces();

  if (!(interface in interfaces)) {
    throw new Error(`Network interface ${interface} is not exists`);
  }

  const ipv4Address = interfaces[interface].find(
    ({ family }) => family === "IPv4"
  );

  if (!ipv4Address) {
    throw new Error(`IPV4Address has not found`);
  }

  return ipv4Address.address;
}

module.exports = function ipAddressResolver({
  interface = "eth0",
  host = "",
  port = 3000,
}) {
  return {
    interface,
    host: host || interface ? getAddressOfInterface(interface) : "127.0.0.1",
    port,
  };
};
