/**
 * Created by Max Pavlov on 12/27/2016.
 */

//Authentication setup
var CryptoJS = require('node-cryptojs-aes').CryptoJS;

function matchPath(mask, path){
    mask=mask.toLowerCase();
    path=path.toLowerCase();
    if (path.indexOf("?")>0)
        path=path.substring(0, path.indexOf("?"));
    var maskArray=mask.split("/");
    var pathArray=path.split("/");
    if (maskArray.length!=pathArray.length) return false;
    for (var i= 0; i<maskArray.length; i++){
        if ((maskArray[i]!="*") && (pathArray[i]!=maskArray[i])) return false;
    }
    return true;
}

//Check if route should be authorized and return route setting
function checkUrl(url, method, routes){
    method=method.toLowerCase();
    for (var i=0; i<routes.length; i++){
        var route=routes[i];
        if ((matchPath(route.url,url)) && (method==route.method)) return route;
    }
    return false;
}

function decryptToken(settings){
    var decrypted = CryptoJS.AES.decrypt(settings.bearer, settings.serverKey);
    var token;
    try{
        token=JSON.parse(CryptoJS.enc.Utf8.stringify(decrypted));
    }catch(e){
    }
    return token;
}

function bearerJS(settings) {
    //Check if URL should be authenticated and redirect accordingly
    settings.app.use(function (req, res, next) {

        var bearer = req.get('Authorization');

        var token;
        if (bearer){
            bearer=bearer.replace('Bearer ','');
            token=decryptToken({
                bearer:bearer,
                serverKey:settings.serverKey
            });
        }

        var proceed=function(){
            req.authToken=token;
            req.isAuthenticated=true;
            if (settings.onAuthorized){
                settings.onAuthorized(req, token, res);
            }
            next();
        };

        var cancel=function(statusCode, errorMessage){
            res.statusCode=(statusCode || 401);
            res.statusText=errorMessage;
            if (settings.onUnauthorized){
                settings.onUnauthorized(req, token, res, errorMessage);
            }else{
                res.send({error:errorMessage});
            }
        };

        var isAuthenticated=false;
        var routeCheck=checkUrl(req.url,req.method.toLowerCase(),settings.secureRoutes);
        if (routeCheck){
            if (token){
                var tokenValid=settings.validateToken(req,token);
                if (!tokenValid){
                    cancel(401, "Token expired");
                }else //Authorized request
                {
                    if (settings.onTokenValid){
                        settings.onTokenValid(token, function(){
                            if (routeCheck.roles){ //if there is a Role based limit to request
                                settings.userInRole(token, routeCheck.roles, function(){proceed()}, function(){cancel(401,"User role rejected")});
                            }else
                            {
                                proceed();
                            }
                        }, function(){cancel(401, "User disabled")});
                    }else
                    {
                        if (routeCheck.roles){ //if there is a Role based limit to request
                            settings.userInRole(token, routeCheck.roles, function(){proceed()}, function(){cancel(401,"User role rejected")});
                        }else
                        {
                            proceed();
                        }
                    }
                }
            }else
            {
                cancel(401,"Invalid token");
            }
        }else
        {
            proceed();
        }
    });

}

module.exports = bearerJS;
