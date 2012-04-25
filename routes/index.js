var fs = require("fs");
var pg = require('pg').native; 
var path = require('path');
var program = require('commander');
var client; 
var rails_env; // Will be set to "development" or "production" on start
var shell = require('shelljs');

// Dictionary mapping usernames to account information 
var users = {};
var dbFile = 'userdb.json';
var uid = '';


var cwd = process.cwd();


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
  fs.stat(req.session.currentdir + req.body.path, function(err, stats) { 
    if(err) {
      console.error('Error when trying to read the file ' + path + '\n' + err);
      res.send('');
    }
    else if(stats.isDirectory()) {
      var filesAsHTML = ls(path.join(req.session.currentdir, req.body.path));
      res.send({ files: filesAsHTML,
                 currentdir: req.session.currentdir });
    }
    else if(stats.isFile()) { 
      res.send({ url : path.join('download',req.session.username, req.body.path)});
    }
  });
});

/*
 * This method based on the response by loganfsmyth to this Stack Overflow question: 
 * http://stackoverflow.com/questions/7288814/download-file-from-nodejs-server
 * 
 *     user supplied paths taken from here: 
 * http://docs.nodejitsu.com/articles/file-system/security/introduction
 * 
 */
exports.downloadFile = loginRequired(function(req, res) {
    if(req.params.user !== req.session.username){
      res.send('<p>Forbidden</p>', 403);
    } else {
	root = path.join(cwd, 'users', req.params.user);
	if(path.join(cwd, 'users', req.params.user, req.params.path).indexOf(root) !== 0){
	    res.send('<p>Forbidden</p>', 403);
	}
	else { 
	    //make sure this is actually correct. Refactor after testing.
	    fs.stat(path.join(cwd, 'users', req.params.user, req.params.path), function(err, stats) { 
      if(err){
          res.send('<p>An error occured ' + err + '</p>', 500);
      } else if (stats.isFile()) { 
          var filestream, 
          filename = path.join(cwd, 'users', req.params.user, req.params.path);
          
          res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(filename));
          res.setHeader('Content-type', getMimeType(path));
          
          filestream = fs.createReadStream(filename);
          filestream.on('data', function(chunk) {
                res.write(chunk);
            });

          filestream.on('end', function() { 
                res.end();
                });
          }
      });
  }
    }
});



// Returns the classes of a file, such as clickable
function getClasses(filepath) {
  return 'class="clickable" ';
};


exports.getCurrentDirectory = function(req, res) {
  res.send({ path: req.session.currentdir });
};


// Returns the image, as html, used to represent the given file
function getImage(filepath) {

  var mime = getMimeType(filepath);


  //console.log(mime);
  var imgpath = "";
  if (mime.substring(2,mime.indexOf('\n')) == "application/x-directory"){
    imgpath = "images/folder.png";
  } 

else if (mime.substring(2) != "application/x-directory"){ 
   mime = mime.substring(2, mime.indexOf("/"));
  //audio
    if (mime === 'audio'){
      imgpath = "images/audio_basic.png";
    }
  //image
    else if (mime === 'image'){
      imgpath = "images/image.png";
    }
  //text
    else if (mime === 'text'){
      imgpath = "images/text_plain.png";
    }
  //video
    else if (mime === 'video'){
      imgpath = "images/video_x_generic.png";
    }
  //application
    else if (mime === 'application'){
      imgpath = "images/application_octet_stream.png";
    }
  //other
    else imgpath = "images/unknown.png";
  }
  return '<img src=' + imgpath + '>';
};

// Returns a file's mime type
function getMimeType(filepath) {
  var mimetype;
  mimetype = (shell.exec("file --mime-type '" + filepath + "'", {silent:true}).output);
  mimetype = mimetype.substring(mimetype.indexOf(": "), mimetype.length);
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
        users[row.name] = { password : row.password};
      });
    });
  });
};


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

  for (i = 0; i < filenames.length; i++) {
    myfiles += '<a id="' + filenames[i] + '" ' +
               //getClasses(path + filenames[i]) + "href='javascript:history.pushState(null,null," + '"' + filenames[i] + '"' + ")'>" +
               getClasses(path + filenames[i]) + '>' +
               getImage(path + filenames[i]) + '<br />' + filenames[i] + '</a>';
  }

  console.log("myfiles.length is " + myfiles.length);
  if (parseInt(myfiles.length) == 0) {
    myfiles = '<img id="loading" src="images/BagOfHolding>"';
  }

  return myfiles;
};


exports.newUser = function(req, res) {
    var result = addUser(req.body.username, req.body.password);

    res.redirect('home');
};


exports.setCurrentDirectory = function(req, res) {
  var path = req.body.path;
  console.log("current dir is: " + req.session.currentdir);
  console.log("setting current dir to: " + path);
  req.session.currentdir = path;

  res.send({});
}


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
    res.send({ });
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
