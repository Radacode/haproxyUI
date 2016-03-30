var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http');
var bodyParser = require("body-parser");
var Curl = require( 'node-libcurl' ).Curl;
var Promise = require('promise');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

var HOST = process.argv[2] || '127.0.0.1';
console.log('Will start on host: %s', HOST);

var PORT = process.argv[3] || 8080;
console.log('Will start on port: %s', PORT);

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
        
        

        

        function getPromise(backend) {
            return new Promise(function(resolve) {
                
                var curl = new Curl();

                curl.setOpt( 'URL', backend );
                curl.setOpt( 'FOLLOWLOCATION', true );

                curl.on( 'end', function( statusCode) {
                    console.info(backend + ' is available');
                    resolve("Available");
                    this.close();
                });
                curl.on( 'error', function(){
                    console.info(backend + ' is not available');
                    resolve("Not available");
                    curl.close.bind( curl ) });
                curl.perform();
                
         });
        }

        Promise.all(tempBackends . map(getPromise)) .
        then(function(stats) {

            for(var i = 0; i < stats.length; ++i)
            {
                IPs[i].status = stats[i];
            }

            res.json(IPs);
        });
       
       
    }
    try{IPs('/etc/haproxy/haproxy.cfg');}
    catch(e){ console.log(e); 
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

app.post('/certificate', function(req, res){
    
  var haproxy_origin = fs.readFileSync('/etc/haproxy/haproxy.cfg', 'utf8');
  var haproxy_splited_rows = haproxy_origin.split('\n');
           
  var certificate = req.body.pem;
  var name = req.body.name;
  var front = req.body.frontend;
  console.log("Add crt to front:   " + front);

  var path = '/etc/pki/tls/private/' + name + '.pem';
  var restartCmd = 'service haproxy restart';
  
  var exec = require('child_process').exec;
  
  for(var i = 0; i<haproxy_splited_rows.length; ++i){
      if (haproxy_splited_rows[i].indexOf('bind') >=0 && haproxy_splited_rows[i].indexOf(front + ':') >=0){
          haproxy_splited_rows[i] += ' ssl crt /etc/pki/tls/private/' + name +'.pem';
      }
  }
  
  var new_haproxy = haproxy_splited_rows.join('\n');
  
  fs.writeFile(path, certificate, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log('Certificate wroten in ' + path);
            
                fs.writeFile('/etc/haproxy/haproxy.cfg', new_haproxy, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log('haproxy.cfg updated');
            
                    exec(restartCmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log('exec error: ' + error);
                        }
                        console.log('Restarting haproxy');
                    });
            });  
 });
});

var server = app.listen(PORT, HOST, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('haproxyUI listening at http://%s:%s', host, port);
});
