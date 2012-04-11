/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
		  app.set('views', __dirname + '/views');
		  app.set('view engine', 'jade');
		  app.use(express.bodyParser());
		  app.use(express.cookieParser());
		  app.use(express.session({secret: "cs391wp bag of holding"}));
		  app.use(express.methodOverride());
		  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
		  app.use(app.router);
		  app.use(express.static(__dirname + '/public'));
	      });

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/logout', routes.logout);
app.get('/create', routes.create);
app.get('/home', routes.home);
 
app.post('/authenticate', routes.authenticate);
app.post('/new_user', routes.newUser);

routes.loadUsers();

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
