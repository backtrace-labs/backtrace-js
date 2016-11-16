var http = require('http');
var url = require('url');
var serveStatic = require('serve-static');
var StreamSink = require('streamsink');

var serve = serveStatic(__dirname, {index: ['index.html']});

var server = http.createServer(function(req, resp) {
  var parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/post') {
    console.error(req.url);
    var sink = new StreamSink();
    sink.on('finish', function() {
      var json;
      var str = sink.toString();
      try {
        json = JSON.parse(sink.toString())
      } catch (err) {
        console.error("bad json: " + err.message);
        console.error(str);
        return;
      }
      console.error(JSON.stringify(json, null, 2));
    });
    req.pipe(sink);
    resp.statusCode = 200;
    resp.end();
    return;
  }
  serve(req, resp, function(err) {
    if (err) throw err;
  });
});

server.listen(11369, function() {
  console.error("Test server listening at http://localhost:11369/");
});
