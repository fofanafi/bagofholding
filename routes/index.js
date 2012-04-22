var fs = require("fs");

//Dictionary mapping usernames to account information 
var users = {};
var dbFile = 'userdb.json';
var uid = '';

function addUser(name, password) {
  var validate = validateNewUser(name, password);

  if(!validate.valid) {
    return validate.message;
  }

  fs.mkdir("users", 0777);
  fs.mkdir("users/" + name, 0777);

  users[name] = { uname : name, 
                  password : password };

  storeUserData();
  return "Created user " + name + ".";
};


exports.authenticate = function(req, res) {
  var result; 

  if(!users[req.body.username]) { 
    result = 'User ' + req.body.username + ' not found.';
  }
  else if(users[req.body.username].password === req.body.password) {
    req.session.username = req.body.username;
    uid = req.body.username;
    res.redirect('/index');
    return;
  }
  else {
      result = 'Incorrect password.';
  }

  res.redirect('home');
};


exports.homepage = function(req, res) {
  if(req.session && req.session.username) {
    res.redirect('/index');
  }
  else {
    res.render('home', { title: 'Homepage' });
  }
};


exports.index = loginRequired(function(req, res){ 
				  var myfiles = '<p>';
				  var filenames = fs.readdirSync('users/' + uid); 
				  for (i = 0; i < filenames.length; i++) {
				      myfiles += filenames[i] + '<br />';
				  }
				  myfiles += '</p>';
				  res.render('index', { title: 'Bag of Holding',
							user: uid,
							flist: myfiles });
			      });



exports.loadUsers = function(cb) {
  fs.readFile(dbFile, function(err, data) {
    if (err) {
      console.error("Unable to load file: " + dbFile);
    }
    else {
      try {
        users = JSON.parse(data);
      }
      catch(e) {
        console.error('Unable to parse JSON from file:\n' + dbFile + '\nDue to error:\n' + e);
      } 
    }
    if(!users) {
      console.error("Data in " + dbFile + " is invalid. Reinitializing bank records.");
      users = {};
    }

    if(cb) {
      cb(users);
    }
  });
};


function loginRequired(routeFunction) {
  return function(req, res){
    if(!req.session.username) {
      res.redirect('/');
      return;
    } 
    else {
      routeFunction(req, res);
    }
  };
}; 


exports.logout = loginRequired(function(req, res) {
  if(req.session.username){
    req.session.destroy();
  }
  res.redirect('home');
});


exports.newUser = function(req, res) {
    var result = addUser(req.body.username, req.body.password);

    res.redirect('home');
};


function storeUserData(cb) {
  fs.writeFile(dbFile, JSON.stringify(users), function(err) {
    if(err) {
      console.error("Unable to write file: " + dbFile);
    }
    if(cb) {
      cb();
    }
  });
};


// Uploads a file
exports.upload = function(req, res) {
  var file = req.files.file;
  console.log("Got file " + file.name);

  var movePath = "users/" + req.session.username + "/" + file.name;

  fs.rename(file.path, movePath, function(err) {
    if(err) {
      console.error("Unable to write file: " + file.name);
    }
    else {
      console.log("Moved file, " + file.name + ", to " + movePath);
    }
  });

  res.send({}); // Send an empty response so the connection can be closed
};


function validateNewUser(name, password) {
  var result = { valid : true,
                 message : '' };

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
