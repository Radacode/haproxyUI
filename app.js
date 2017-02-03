var express = require('express');
var app = module.exports = express();

var fs = require('fs'),
    http = require('http'),
    bodyParser = require("body-parser"),
    dateFormat = require('dateformat'),
    path = require('path'),
    now = new Date();

var bearer = require('./middlewares/bearer-auth');

bearer({
    //Make sure to pass in the app (express) object so we can set routes
    app:app,
    //Please change server key for your own safety!
    decryptionKey:"IxrAjDoa2FqElO7IhrSrUJELhUckePEPVpaePlS_Xaw",
    loginUrl:'/login',
    validateToken:function(req, token){
        //you could also check if request came from same IP using req.ip==token.ip for example
        if (token){
            return moment(token.expire)>moment(new Date());
        }
        return false;
    },
    onTokenValid:function(token, next, cancel){
        //This is in case you would like to check user account status in DB each time he attempts to do something.
        //Doing this will affect your performance but its your choice if you really need it
        //Returning false from this method will reject user even if his token is OK
        var username=token.username;
        if (true){
            next()
        }else{
            cancel();
        }
    },
    userInRole:function(token, roles, next, cancel){
        //Provide role level access restrictions on url
        //You can use onTokenValid for this also, but I find this easier to read later
        //If you specified "roles" property for any secureRoute below, you must implement this method
        var username=token.username;

        if (true){
            next();
        }else
        {
            cancel();
        }
    },
    secureRoutes:[
        {url:'/haproxy/status/', method:'get'}
    ]
});

app.use(express.static(path.join(__dirname + '/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))

app.use(require('./controllers'));

if (!fs.existsSync(__dirname + '/log')){
    fs.mkdirSync(__dirname + '/log');
}

var HOST = process.argv[2] || '127.0.0.1';
console.log(dateFormat(now) + '   ' + 'Will start on host: %s', HOST);

var PORT = process.argv[3] || 8080;
console.log(dateFormat(now) + '   ' + 'Will start on port: %s', PORT);

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname + '/views/index.html'));
});

var server = app.listen(PORT, HOST, function () {
    var host = server.address().address;
    var port = server.address().port;
    
    var writable = fs.createWriteStream(__dirname + '/log/haproxyUI-log.log');
    process.stdout.write = process.stderr.write = writable.write.bind(writable);

    console.log(dateFormat(now) + '   ' + 'haproxyUI listening at http://%s:%s', host, port);
});
