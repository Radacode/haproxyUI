haproxyApp.factory('loginFactory', ['$http', '$q', 'localStorageService', '$location', function ($http, $q,localStorageService, $location) {

    var loginFactory = {};

    var _login= function(loginModel) {
        var data = "grant_type=password&username=" + loginModel.username + "&password=" + loginModel.password;

        var deferred = $q.defer();

        $http.post(
            appConfig.loginBase + appConfig.auth.token,
            data,
            { headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

            .then(function(response) {
                localStorageService.set('authorizationData',
                    { token: response.data.access_token, username: response.data.userName });
                deferred.resolve(response);

            }, function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _logOut = function () {
        localStorageService.remove('authorizationData');
        $http.get(appConfig.baseApiUrl + appConfig.auth.logout);
        $location.path('/login');
    };

    loginFactory.login = _login;
    loginFactory.logOut = _logOut;
    return loginFactory;
}]);