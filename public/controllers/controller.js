var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("Hello World from controller");
    
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

        $http.post('/certificate', $scope.crt).success(function(response){

           
     
        });
        
    };

    $http.get('/haproxy').success(function(response){
	      
	if(response == 'haproxy.cfg not found'){$scope.errr = response;}
		
	else { 
        $scope.ipObjArr = response; 
    }
      
    });

    $http.get('/view').success(function(response){
      $scope.file = response; 
    });

}]);
