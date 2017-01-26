var haproxyApp = angular.module('haproxyUI', ['ui.router', 'LocalStorageModule', 'cgNotify']).config(function ($stateProvider, $locationProvider, $urlRouterProvider) {
    $stateProvider
        .state('app', {
            url: '/',
            views: {
                '': {
                    templateUrl: "/scripts/views/app.html",
                    controller: "AppController"
                }
            }
        })
        .state('app.home', {
            url: "dashboard",
            views: {
                'content': {
                    templateUrl: "/scripts/views/dashboard.html",
                    controller: "DashboardController"
                }
            }
        })
        .state('app.login', {
            url: "login",
            views: {
                'content': {
                    templateUrl: "/scripts/views/login.html",
                    controller: "LoginController"
                }
            }

        });

    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
    $urlRouterProvider.otherwise('/');

});

haproxyApp.config(function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptorFactory');
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];


}).run(['$rootScope', '$state', '$stateParams',
        function ($rootScope, $state, $stateParams) {
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
        }]);

