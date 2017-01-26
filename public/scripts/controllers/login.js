haproxyApp.controller('LoginController', ['$scope',"$http",'$location','$window','$log','loginFactory','$state', function ($scope,$http,$location,$window,$log,loginFactory, $state) {

    $scope.loginModel = {
        username: "",
        password: ""
    };

    $scope.isFlipping = false;

    $scope.login = function() {

        if ($scope.isLoggingIn) {
            $log.info("Login in progress.");
            return;
        } else {

            $scope.isFlipping = true;
            $scope.isLoggingIn = true;

            loginFactory.login($scope.loginModel)
                .then(function (res) {
                        $scope.isLoggingIn = false;
                        $scope.isFlipping = false;
                        $state.go('app.home');
                    },
                    function (errorPayLoad) {
                        $scope.isLoggingIn = false;
                        $scope.isFlipping = false;
                        $log.error(errorPayLoad);
                    })
                .catch(function (error) {
                    $scope.isLoggingIn = false;
                    $scope.isFlipping = false;
                    $log.error(error.stack);
                });
        }
    };
}]);

haproxyApp.controller('LogoutController', ['$scope', 'Page', 'loginFactory', '$state', function ($scope, Page, loginFactory, $state) {

    $scope.logout = function () {
        loginFactory.logOut();
    };

}]);