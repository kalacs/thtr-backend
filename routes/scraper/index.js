module.exports = function (f, { scraper }, next) {
  f.get("/moviesByImdb/:id", ({ params: { id } }) =>
    scraper.getMovieByImdb(id)
  );

  next();
};
module.exports.autoPrefix = "/scraper";
