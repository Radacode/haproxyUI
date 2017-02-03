/**
 * Created by Max Pavlov on 12/27/2016.
 */

//Authentication setup
var CryptoJS = require('node-cryptojs-aes').CryptoJS;
var base64url = require('base64url');
var jwt = require('jsonwebtoken');

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

function decryptToken(params){

/*    var key = Buffer.from(params.serverKey, 'hex');
    var keyWords = CryptoJS.lib.WordArray.create(key);
    var base64 = base64url.toBase64(params.bearer);
    var decoded = CryptoJS.enc.Base64.parse(base64);
    var iv = Buffer.alloc(16);

    for (var i = 0 ; i < 4 ; i++) {
        var currentBuffer = Buffer.from(decoded.words[i].toString(16).match(/../g).map(s=>parseInt(s, 16)));
        for (var x = 0 ; x < 4 ; x ++) {
            iv[i*4 + x] = currentBuffer[x];
        }*/
    var token = params.bearer;
    var base64Secret = base64url.toBase64(params.serverKey);
    var secret = new Buffer(base64Secret, "base64");
    try {
        var decoded = jwt.verify(
            token,
            secret);
    } catch(err) {
        console.log(err);
    }

    if(!decoded) {
        decoded = jwt.decode(token);
    }
    var token;
    try{
        token=JSON.parse(CryptoJS.enc.Utf8.stringify(decoded));
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
                serverKey:settings.decryptionKey
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
