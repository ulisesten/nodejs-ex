var jwt = require('../utils/json-tokens'),
    csrf = require('../utils/csrf-tokens'),
    query = require('../database/queries'),
    nanoid = require('nanoid'),
    cookie = require('cookie'),
    bcrypt = require('bcryptjs');

var body = '';

/**Handle the registration request */
function registrationApi(req, res){
    req.on('data', data => { body += data; });

    req.on('end', () => {

        body = JSON.parse(body);

        //data to create json web token
        var dataToEncode = {
            'id': nanoid(),
            'correo': body.correo,
            'usuario': body.nombre,
            'clave': body.contrasena,
            'imagen': '',
            'tipo': 0,
            'ip': [req.connection.remoteAddress],
            'contrib': body.contrib,
            'tiempo': new Date()
        }

        console.log('data',dataToEncode)

        //Token to store in the cookie
        var regToken = jwt.createJWT(dataToEncode);

        var mycookie = genCookie(regToken);

        //Check if user is in data base already
        query.checkUser(body.correo, function(data){

            //Verify the csrf token and expect to receive null as result from database
            if( csrf.verify(req.csrf.secret, body.csrf) && data === null ){

                //salt to encrypt passwords
                bcrypt.genSalt(10, function(err, salt) {

                    if(!err){
    
                        //encrypt passwords
                        bcrypt.hash(body.contrasena, salt, function(err, hash){
    
                            if(!err){
                                
                                //setting the response
                                console.log('csrf passed');
                                res.writeHead(200, { 'Set-Cookie': mycookie,'Content-Type': 'application/json; charset=utf-8' });
                                res.write(JSON.stringify({ nombre: body.nombre, token: regToken}));
                                res.end();
                            
                            }
    
                        })
    
                    } else { console.log('error at bcrypt.genSalt'); }
    
                });

            } else {

                console.log('csrf NOT passed');
                res.writeHead(404);
                res.end();

            }

        });

    });
}


/**Handle the login request */
function loginApi(req, res){
    req.on('data', data => { body += data; });

    req.on('end', () => {

        body = JSON.parse(body);

        var dataToEncode = {
            'correo': body.correo,
            'contrasena': body.contrasena,
        }

        var loginToken = jwt.createJWT(dataToEncode);

        var mycookie = genCookie(loginToken);

        query.checkUser(body.correo, function(data){

            if( csrf.verify(req.csrf.secret, body.csrf) ){
                
                if(body.correo === data.correo){
                    console.log('login csrf passed');
                    res.writeHead(200, { 'Set-Cookie': mycookie,'Content-Type': 'application/json; charset=utf-8' });
                    res.write(JSON.stringify({ nombre: data.nombre , token: regToken}));
                }

            } else {
                console.log('login csrf NOT passed');
                res.writeHead(404);

            }

            res.end();

        });

    });
}

function genCookie(toCookie){
    return cookie.serialize('token', String(toCookie), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/'
    })
}

module.exports = {
    registrationApi,
    loginApi
}