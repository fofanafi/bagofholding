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
  routes.setEnv("development");
  routes.loadDB_JSON();
});

app.configure('production', function(){
  app.use(express.errorHandler());
  routes.setEnv("production");
  routes.loadDB_postgres();
});

// Routes
app.get('/', routes.homepage);
app.get('/logout', routes.logout);
app.get('/index', routes.index);
app.post('/upload', routes.upload);
 
app.post('/authenticate', routes.authenticate);
app.post('/new_user', routes.newUser);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

