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


exports.homepage = function(req, res) {
  if(req.session && req.session.username) {
    res.redirect('/index');
  }
  else {
    res.render('home', { title: 'Homepage' });
  }
};


exports.index = loginRequired(function(req, res){ 
  
   var myfiles = '<div class="fileTypeContainer"><p>';
    var filenames = fs.readdirSync('users/' + uid); 
        for (i = 0; i < filenames.length; i++) {
            myfiles += '<a href="#"><img src="images/folder.png"><br />' + filenames[i] + '</a>';
        } 
    myfiles += '</p></div>'
    res.render('index', { 
        title: 'Bag of Holding',
        user: uid,
        flist: myfiles });
			      
});


// This is the JSON version of the DB, used for development
exports.loadDB_JSON = function(cb) {
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

    if(cb) {
      cb(users);
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
    });
  });

  var query = client.query("SELECT name, password FROM users");
  query.on('row', function(row) {
    users[row.name] = { password : row.password}
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
