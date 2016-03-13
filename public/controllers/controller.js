var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http) {
    console.log("Hello World from controller");

    $http.get('/haproxy').success(function(response){
	      
	if(response == 'haproxy.cfg not found'){$scope.errr = response;}
		
	else {$scope.ipObjArr = response;}
      
    });

    $http.get('/view').success(function(response){
      $scope.file = response; 
    });

}]);
