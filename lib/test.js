const makeDLNACast = require("./dlna");
const dlna = makeDLNACast();
dlna.startSearch();
setTimeout(() => {
  dlna.play("http://192.168.0.124:8888");
}, 5000);
