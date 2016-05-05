var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http');
var bodyParser = require("body-parser");
var Curl = require( 'node-libcurl' ).Curl;
var Promise = require('promise');
var dateFormat = require('dateformat');
var now = new Date();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

if (!fs.existsSync(__dirname + '/log')){
    fs.mkdirSync(__dirname + '/log');
}

var HOST = process.argv[2] || '127.0.0.1';
console.log(dateFormat(now) + '   ' + 'Will start on host: %s', HOST);

var PORT = process.argv[3] || 8080;
console.log(dateFormat(now) + '   ' + 'Will start on port: %s', PORT);

app.get('/haproxy', function(req, res){
    
    function IPs(filePath){
        
        var regIP = /^(25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[0-9]{2}|[0-9])(\.(25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[0-9]{2}|[0-9])){3}\:[0-9]{1,4}\n?$/;

        var haproxy_origin = fs.readFileSync(filePath, 'utf8');
        var haproxy_splited_rows = haproxy_origin.split('\n');
        
        //cut and leave only configuration part of haproxy.cfg file
        for(var i = 0; i < haproxy_splited_rows.length; ++i){
            if(haproxy_splited_rows[i] != ''){
                 var temp = haproxy_splited_rows[i].split(' ');
                 if(temp[0] == 'frontend'){
                     haproxy_splited_rows = haproxy_splited_rows.slice(i);
                     break;
                 }
            }
        }

        //delete odd spaces
        for(var i = 0; i < haproxy_splited_rows.length; ++i){
            haproxy_splited_rows[i] = haproxy_splited_rows[i].replace(/^\s*/,'').replace(/\s*$/,'');
        }

        //search for {frontend name : frontend address}
        var frontend_names = {};

        for(var i = 0; i < haproxy_splited_rows.length; ++i){
            var temp = haproxy_splited_rows[i].split(' ');
            for(var j = 0; j < temp.length; ++j){
                if(temp[j] == 'acl'){

                    frontend_names[temp[j+1]] = temp[temp.length - 1];


                }
            }
        }

        //search for {backend name : backend address}
        var backend_part_rows = [];
        for(var i = 0; i < haproxy_splited_rows.length; ++i){
            var temp = haproxy_splited_rows[i].split(' ');
            if(temp[0] == 'backend'){
                backend_part_rows = haproxy_splited_rows.slice(i);
                break;
            }
        }

        var backends_string = '';
        for(var i = 0; i < backend_part_rows.length; ++i){
            backends_string += ' ' + backend_part_rows[i];
        }

        var backend_names = {}; // {backend name : addresses}
        var backends_array_spaces = backends_string.split(' ');
        for(var i = 0; i < backends_array_spaces.length; ++i){

            if(backends_array_spaces[i] == 'backend'){

                backend_names[backends_array_spaces[i + 1]] = '';

                var temp_adr = '';

                for(var j = i; j < backends_array_spaces.length; ++j){

                    if(regIP.test(backends_array_spaces[j])){
                        temp_adr += backends_array_spaces[j] + ' ';
                        backend_names[backends_array_spaces[i + 1]] = temp_adr;
                    }
                    if(backends_array_spaces[j] == 'backend' && j != i){
                        i = j - 1;
                        break;
                    }
                }

            }

        }

        // define pairs front-backend
        var pairs = [];
        for(var i = 0; i < haproxy_splited_rows.length; ++i){
            var temp = haproxy_splited_rows[i].split(' ');
            for(var j = 0; j < temp.length; ++j) {
                if (temp[j] == 'use_backend'){
                    var obj = {};
                    obj.frontend = temp[temp.length - 1];
                    obj.backend = temp[j + 1];
                    pairs.push(obj);
                }
            }
        }

        // build config array [{frontend: 'IP', backend: 'IP', status: ''}, {...}]

        var IPs = [];

        for(var i = 0; i < pairs.length; ++i){
            var obj = {};
            obj.frontend = frontend_names[pairs[i].frontend];
            obj.backend = backend_names[pairs[i].backend];
            obj.status = "Not available";
            IPs.push(obj);
        }

        // preparing for status check
        var tempBackends = [];
        
        for(var i = 0; i < IPs.length; ++i){
            IPs[i].backend = IPs[i].backend.replace(/^\s*/,'').replace(/\s*$/,'');
            tempBackends[i] = "http://" + IPs[i].backend;
        }
        
        var tempFrontends = [];
        
        for(var i = 0; i < IPs.length; ++i){
            IPs[i].frontend = IPs[i].frontend.replace(/^\s*/,'').replace(/\s*$/,'');
            tempFrontends[i] = "http://" + IPs[i].frontend;
        }
        
        var tempIP = [];
        for(var i = 0; i < IPs.length; ++i){
            tempIP[i] = tempFrontends[i] + '|' + tempBackends[i];
           
        }
         
        function getPromise(IP) {
            return new Promise(function(resolve) {
                
                var curl = new Curl();
                
                var backend = IP.split('|')[1];
                console.log(dateFormat(now) + '   ' + 'Backend ' + backend);
                var frontend = IP.split('|')[0];
                console.log(dateFormat(now) + '   ' + 'Frontend ' + frontend);

                curl.setOpt( 'VERBOSE', true );
                curl.setOpt( 'URL', backend );
                curl.setOpt( 'HTTPHEADER', ['Host: ' + frontend]);
                curl.setOpt( 'CONNECTTIMEOUT', 5 );
                curl.setOpt( 'FOLLOWLOCATION', true );
                
                

                curl.on( 'end', function(statusCode) {
                    console.info(dateFormat(now) + '   ' + backend + ' is available');
                    
                    resolve("Available");
                    this.close();
                });
                
                curl.on( 'error', function(statusCode){
                    console.info(dateFormat(now) + '   ' + backend + ' is not available');
                    
                    resolve("Not available");
                    this.close(); 
                });
                
                curl.perform();
                
         });
        }

        Promise.all(tempIP . map(getPromise)) .
        then(function(stats) {

            for(var i = 0; i < stats.length; ++i)
            {
                IPs[i].status = stats[i];
            }

            var data = { IPs : IPs};
            res.json(data);
        });
       
       
    }
    try{IPs('/etc/haproxy/haproxy.cfg');}
    catch(e){ console.log(dateFormat(now) + '   ' + e); 
    res.end('haproxy.cfg not found');
}
    
});


app.get('/download', function(req, res){

  var file = '/etc/haproxy/haproxy.cfg';
  res.download(file);

});

app.get('/view', function(req, res){
  var file = fs.readFileSync('/etc/haproxy/haproxy.cfg', 'utf8');
  res.end(file);
});

app.get('/log', function(req, res){
    var file = fs.readFileSync(__dirname + '/log/haproxyUI-log.log', 'utf8');
    res.end('hello from log');
});

app.post('/certificate', function(req, res){
    
  var haproxy_origin = fs.readFileSync('/etc/haproxy/haproxy.cfg', 'utf8');
  
  var haproxy_splited_rows = haproxy_origin.split('\n');
  
  var pathToStoreCerts = '';
  var cont = true;
  
  for(var i = 0; i < haproxy_splited_rows.length && cont; ++i){
      
      var row = haproxy_splited_rows[i].split(' ');     
      
      for(var j = 0; j < row.length && cont; ++j){
          
          if(row[j].indexOf('crt-base') >= 0){
              pathToStoreCerts = row[j + 1];
              cont = false;
              break;
          }
      }
  }
  
  console.log(dateFormat(now) + '   ' + 'Store certificates in ' + pathToStoreCerts);
  
  pathToStoreCerts = pathToStoreCerts.replace(/[\n\r]+/g, '');
           
  var certificate = req.body.pem;
  var name = req.body.name;
  var front = req.body.frontend;
  console.log(dateFormat(now) + '   ' + "Add crt to front:   " + front);
  
  var path = pathToStoreCerts + '/' + name + '.pem';
  var restartCmd = 'service haproxy restart';
  
  var exec = require('child_process').exec;
  
  for(var i = 0; i < haproxy_splited_rows.length; ++i){
      if (haproxy_splited_rows[i].indexOf('bind') >=0 && haproxy_splited_rows[i].indexOf(front + ':') >=0){
          haproxy_splited_rows[i] += ' ssl crt ' + path;
      }
  }
  
  var new_haproxy = haproxy_splited_rows.join('\n');
  
  fs.writeFile(path, certificate, function (err) {
            if (err) {
                return console.log(dateFormat(now) + '   ' + err);
            }
            console.log(dateFormat(now) + '   ' + 'Certificate wroten in ' + path);
            
                fs.writeFile('/etc/haproxy/haproxy.cfg', new_haproxy, function (err) {
                if (err) {
                    return console.log(dateFormat(now) + '   ' + err);
                }
                console.log(dateFormat(now) + '   ' + 'haproxy.cfg updated');
            
                    exec(restartCmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log(dateFormat(now) + '   ' + 'exec error: ' + error);
                        }
                        console.log(dateFormat(now) + '   ' + 'Restarting haproxy');
                    });
            });  
 });
});

var server = app.listen(PORT, HOST, function () {
    var host = server.address().address;
    var port = server.address().port;
    
    var writable = fs.createWriteStream(__dirname + '/log/haproxyUI-log.log');
    process.stdout.write = process.stderr.write = writable.write.bind(writable);

    console.log(dateFormat(now) + '   ' + 'haproxyUI listening at http://%s:%s', host, port);
});
