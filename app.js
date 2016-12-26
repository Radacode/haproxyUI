var express = require('express');
var app = module.exports = express();

var fs = require('fs'),
    http = require('http'),
    bodyParser = require("body-parser"),
    dateFormat = require('dateformat'),
    now = new Date();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

if (!fs.existsSync(__dirname + '/log')){
    fs.mkdirSync(__dirname + '/log');
}

var HOST = process.argv[2] || '127.0.0.1';
console.log(dateFormat(now) + '   ' + 'Will start on host: %s', HOST);

var PORT = process.argv[3] || 8080;
console.log(dateFormat(now) + '   ' + 'Will start on port: %s', PORT);

app.use(require('./controllers'))

app.listen(PORT, HOST, function () {
    var host = server.address().address;
    var port = server.address().port;
    
    var writable = fs.createWriteStream(__dirname + '/log/haproxyUI-log.log');
    process.stdout.write = process.stderr.write = writable.write.bind(writable);

    console.log(dateFormat(now) + '   ' + 'haproxyUI listening at http://%s:%s', host, port);
});
