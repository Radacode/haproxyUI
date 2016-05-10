var myApp = angular.module('myApp', ['cgNotify', 'angular-loading-bar']);
myApp.controller('AppCtrl', ['$scope', '$http','notify', function($scope, $http, notify) {
    console.log("controller.js is working");
    
    function copyTo(from, to){
        var control = document.getElementById(from);
        control.addEventListener("change", function(event){
            var reader = new FileReader();
            reader.onload = function(event){
                var contents = event.target.result;
                document.getElementById(to).value = contents;
                document.getElementById(to).setAttribute("class", "uk-form-success");
                
		var textareaName = document.getElementById(to).attributes["name"].value;
		if(textareaName == 'crt') { 
              $scope.$apply(function() {
                  $scope.AppForm.crt.$invalid = false;
                  document.getElementById("certName").value = control.files[0].name;
                  $scope.AppForm.name.$invalid = false;
                  
              });
        }
            };
            reader.onerror = function(event){
                console.error("File could not be read! Code " + event.target.error.code);
            };
            console.log("Filename: " + control.files[0].name);
            reader.readAsText(control.files[0]);
        }, false);
    }
    
    document.getElementById("pemDownload").click(copyTo('pemDownload','pemTextarea'));
    
    $scope.installCrt = function(){
        
        $scope.crt.pem = document.getElementById("pemTextarea").value;
        $scope.crt.name = document.getElementById("certName").value;

        $http.post('/certificate', $scope.crt)
        .then(function successCallback(response) {
                console.log('Status code from /certificate ' + response.status);
                
                notify({ message:'Your certificate installed successfully!',
                         classes:['uk-form-success']} );
                
        }
            , function errorCallback(response) {
                console.log('Status code from /certificate ' + response.status);
                notify({ message: 'Error. Watch log.',
                         classes:['uk-form-danger']} );
                
        });
        
    };
    
    $scope.log = function(){

        $http.get('/log')
        .then(function successCallback(response) {
                console.log('Status code from /log ' + response.status);
                console.log(response.data);
        }
            , function errorCallback(response) {
                console.log('Status code from /log ' + response.status);
                console.log(response.data);
                notify({ message: 'Error. No log. Look in console.',
                         classes:['uk-form-danger']} );
        });

    };

    $http.get('/haproxy')
    .then(function successCallback(response) {
                console.log('Status code from /haproxy ' + response.status);
                if(response == 'haproxy.cfg not found'){$scope.errr = response.data;}
		
                else { 
                    $scope.ipObjArr = response.data.IPs;
                }
        }
         ,function errorCallback(response) {
                console.log('Status code from /haproxy ' + response.status);
                console.log(response.data);
                notify({ message: 'Error. Watch log.',
                         classes:['uk-form-danger']} );
        });
    
  
    $http.get('/view')
    .then(function successCallback(response) {
                console.log('Status code from /view ' + response.status);
                $scope.file = response.data; 
        }
            , function errorCallback(response) {
                console.log('Status code from /view ' + response.status);
                console.log(response.data);
                notify({ message: 'Error. Watch log.',
                         classes:['uk-form-danger']} );
        });
}]);
