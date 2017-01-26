haproxyApp.controller('AppController', ['$scope', '$state', 'localStorageService', function ($scope, $state, localStorageService) {
    var authData = localStorageService.get('authorizationData');
    if (!authData) {
        $state.go('app.login');
    }
}])
