haproxyApp.controller('LoginController', ['$scope',"$http",'$location','$window','$log','loginFactory','checkFactory', function ($scope,$http,$location,$window,$log,loginFactory,checkFactory) {

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

                        checkFactory.get()
                            .then(function () {
                                    $window.location = appConfig.baseUrl + 'control';
                                },
                                function (errorPayLoad) {
                                    $scope.isFlipping = false;
                                    $scope.isLoggingIn = false;
                                    $log.error(errorPayLoad);
                                });
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