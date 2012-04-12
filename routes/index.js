var fs = require("fs");

var loginRequired = function(routeFunction){
    return function(req, res){
	if(!req.session.username){
	    res.redirect('/login');
	    return;
	}  else{
	    routeFunction(req, res);
	}
    };
}; 


//Dictionary mapping usernames to account information 
var users = {};
var dbFile = 'userdb.json';

var storeUserData = function(cb) {
    fs.writeFile(dbFile, JSON.stringify(users), function (err){
	    if(err){
    	    console.error("Unable to write file: " + dbFile);
    	}
    	if(cb){
    	    cb();
    	}
    });
};

var addUser =  function(name, password){
    var validate = validateNewUser(name, password);

    if(!validate.valid){
	return validate.message;
    }
    
    fs.mkdir("users", 0777);
    fs.mkdir("users/" + name, 0777);
    
    users[name] = { uname : name, 
		    password : password
		  };

    storeUserData();
    return "Created user " + name + ".";
};

var validateNewUser = function(name, password){
    var result = {valid : true,
	      message : ''};

    if(!name || !password){
	result.message = 'Must specify both name and password.\n';
	return result;
    }

    if(name.length === 0){
	result.valid = false;
	result.message += 'Name can not have zero-length.\n';
    }

    if(password.length === 0){
	result.valid = false;
	result.message += 'Password cannot have zero-length.\n';
    }
    
    if(users.name){
	result.valid = false;
	result.message += "User " + name + " already exists.\n" + 
	    "You must specify a different user name.\n";
    } 
    
    return result;
};

exports.index = function(req, res){ 
    res.render('index', { title: 'User Home'});

var fs = require('fs');


fs.readdir('users/v', function (err, files) {
if (err) console.error(err);
console.log(files);
});


};
   
exports.login = function(req, res) {
    if(req.session && req.session.username){
	res.redirect('/index');
    }
    else{ 
	res.render('login',
		   { title: 'Login', message:''}); 
    }
};


exports.homepage = function(req, res) {
     res.render('home', { title: 'Welcome to Bag of Holding!'});
};


exports.authenticate = function(req, res) {
    var result; 
    
    if(!users[req.body.username]) { 
	result = 'User ' + req.body.username + ' not found.';
    }
    else if(users[req.body.username].password === req.body.password){
	req.session.username = req.body.username;
	res.redirect('/index');
	return;
    }
    else {
	result = 'Incorrect password.';
    }

    res.render('login',
	       { title : 'Login', message : result });
};

exports.logout = loginRequired(function(req, res) {
    if(req.session.username){
	req.session.destroy();
    }
    res.redirect('/login');
});

exports.newUser = function(req, res) {
    var result = addUser(req.body.name, req.body.password, req.body.dateOfBirth);
    
    res.render('login', 
	       {title : 'Login', message : result});
};

exports.create = function(req, res) {
    res.render('create', 
	       { title: 'Create Account'});
};

exports.loadUsers = function(cb){
    fs.readFile(dbFile, function(err, data){
	if (err) {
	    console.error("Unable to load file: " + dbFile);
	}else{
	    try{
		users = JSON.parse(data);
	    }
	    catch(e){
		console.error('Unable to parse JSON from file:\n' + dbFile + '\nDue to error:\n' + e);
	    } 
	}
	if(!users){
	    console.error("Data in " + dbFile + " is invalid. Reinitializing bank records.");
	    users = {};
	}

	if(cb){
	    cb(users);
	}
    });
};
