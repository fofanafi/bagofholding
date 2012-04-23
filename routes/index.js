var fs = require("fs");
var pg = require('pg').native; 
var program = require('commander');
var client; 

var rails_env; // Will be set to "development" or "production" on start


// Dictionary mapping usernames to account information 
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

  users[name] = { password : password };

  if (rails_env == "development") {
    storeUserData_JSON();
  }
  else {
    storeUserData_postgres();
  }
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


// Configures the postgres DB
// This method is not destructive and can be run without issue
function bootstrapDB() {
  // Create the sequence number for the uid field of users
  client.query("CREATE SEQUENCE users_uid_seq", function(err, result) {
    if (err == "Error: relation \"users_uid_seq\" already exists") {
      console.log("This db is already bootstrapped 1/2");
    }
    else if (err) {
      console.error("Recieved error in bootstrap: " + err);
    }
  });

  // Create the 'users' database
  client.query("CREATE TABLE users (uid int not null default nextval('users_uid_seq'), name varchar(20), password varchar(50), primary key (uid))", function(err, result) {
    if (err == "Error: relation \"users\" already exists") {
      console.log("This db is already bootstrapped 2/2");
    }
    else if (err) {
      console.error("Recieved error in bootstrap: " + err);
    }
  });
};


// Decides what action to take when a user clicks a file/folder
exports.click = loginRequired(function(req, res) {
  // if (file is a folder)
    var filesAsHTML = ls(req.session.currentdir + req.body.path)
    res.send({ files: filesAsHTML });
  // else
  //   var file = downloadFile(req.session.currentdir + req.body.path);
  //   res.sent({ files: file });
});


// Returns the classes of a file, such as clickable
function getClasses(filepath) {
  return 'class="clickable" ';
};


// Returns the image used to represent the given file
function getImage(filepath) {
  return '<img src="images/folder.png">';
};


// Returns a file's mime type
function getMimeType(filepath) {
  var mimetype;
  return mimetype;
}


// Renders the homepage. If a user is logged in, redirects them to /index
exports.homepage = function(req, res) {
  if(req.session && req.session.username) {
    res.redirect('/index');
  }
  else {
    res.render('home', { title: 'Homepage' });
  }
};


exports.index = loginRequired(function(req, res) {
  req.session.currentdir = "users/" + req.session.username + "/";

  res.render('index', { title: 'Bag of Holding',
                        username: req.session.username });
});


// This is the JSON version of the DB, used for development
exports.loadDB_JSON = function() {
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
      console.error("Data in " + dbFile + " is invalid. Reinitializing user records.");
      users = {};
    }
  });
};


// This is the postgres version of the DB, used for production
exports.loadDB_postgres = function() {
  program.prompt('User: ', function (user) {
    program.password('Password: ', '*', function (pass) {
      var db = user;
      if (pass) {
        user = user + ":" + pass;
      }

      var conString = "tcp://" + user + "@db-edlab.cs.umass.edu:7391/" + db;
      client = new pg.Client(conString);
      client.connect();

      bootstrapDB();

     var query = client.query("SELECT name, password FROM users");
      query.on('row', function(row) {
        users[row.name] = { password : row.password}
      });
    });
  });
}


function loginRequired(routeFunction) {
  return function(req, res){
    if(!req.session || !req.session.username) {
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


function ls(path) {
  var myfiles = '', filenames = fs.readdirSync(path); 
  console.log("filenameslength: " + filenames.length);

  for (i = 0; i < filenames.length; i++) {
    myfiles += '<a id="' + filenames[i] + '" ' +
               getClasses(path + filenames[i]) + 'href="#">' +
               getImage(path + filenames[i]) + '<br />' + filenames[i] + '</a>';
  }

  return myfiles;
};


exports.newUser = function(req, res) {
    var result = addUser(req.body.username, req.body.password);

    res.redirect('home');
};


exports.setEnv = function(env) {
  rails_env = env;
};


function storeUserData_JSON(cb) {
  fs.writeFile(dbFile, JSON.stringify(users), function(err) {
    if(err) {
      console.error("Unable to write file: " + dbFile);
    }
    if(cb) {
      cb();
    }
  });
};


function storeUserData_postgres(cb) {
  for(x in users) {
    client.query("INSERT INTO users VALUES (default, $1, $2)", [x, users[x].password]);
  }
};


// Uploads a file
exports.upload = loginRequired(function(req, res) {
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
});


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
