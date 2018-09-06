// 진입점 (entry point)
var express = require('express'),
app = express(),
// 핸들바 뷰 엔진 설정 
handlebars = require('express-handlebars')
		.create({ 
			defaultLayout:'main',
			helpers: {
				section: function(name, options){
					if(!this._sections) this._sections = {};
					this._sections[name] = options.fn(this);
					return null;
				},
				static: function(name) {
					return require('./lib/static.js').map(name);
				}
			}
}),
jqupload = require('jquery-file-upload-middleware'),
credentials = require('./credentials.js'),
database = require('./database.js'),
Vacation = require('./models/vacation.js'),

vhost = require('vhost'),
admin = express.Router(),
static = require('./lib/static.js').map;


// set database 
var mongoose = require('mongoose');
var db = mongoose.connection;

var connectModule = require('connect');
var sessionMongoose = require('session-mongoose');
var MongoSessionStore = sessionMongoose(connectModule);


var sessionStore = new MongoSessionStore({
	connection: db
});

db.on('error', console.error);
db.once('open', function() { console.log('Connected to mongo db server'); });

switch(app.get('env')){
	case 'development':
		mongoose.connect(credentials.mongo.development.url, { useNewUrlParser: true, keepAlive: 1 });
		break;
	case 'production':
		mongoose.connect(credentials.mongo.production.url, { useNewUrlParser: true, keepAlive: 1 });
		break;
	default:
		throw new Error('Unknown execution environment: ' + app.get('env'));
}


// log middleware
switch(app.get('env')){
	case 'development':
		app.use(require('morgan')('dev'));
		break;
	case 'production':
		app.use(require('express-logger')({
			path: __dirname + '/log/requests.log'
		}));
		break;
}


var server;
var bodyParser = require('body-parser');
var Attraction = require('./models/attraction.js');


// set up css/js bundling
var configs = require('./config.js');
var connectBunddle = require('connect-bundle');
var bundler = connectBunddle(configs);
var rest = require('connect-rest');
var apiOptions = {
	context: '/api',
	domain: require('domain').create(),
};

apiOptions.domain.on('error', function(err){
	console.log('API domain error.\n', err.stack);
	setTimeout(function(){
		console.log('Server shutting down after API domain error.');
		process.exit(1);
	}, 5000);
	server.close();
	var worker = require('cluster').worker;
	if(worker) worker.disconnect();
});


// config and middleware
app
		.use(express.static(__dirname + '/public'))
		.set('port', process.env.PORT || 3000)
		.engine('handlebars', handlebars.engine)
		.set('view engine', 'handlebars')
		

		// domain to handle all errors for this server
		.use(function(req, res, next){
			var domain = require('domain').create();
			domain.on('error', function(err){
				console.error('DOMAIN ERROR CAUGHT\n', err.stack);
				try{
					setTimeout(function(){
						console.error('Failsafe shutdown.');
						process.exit(1);
					}, 5000);
					
					var worker = require('cluster').worker;
					if(worker) worker.disconnect();
					console.log('Worker %d disconnecting...', worker.id);

					server.close();
					console.log('alarming shutdown...');

					try{
						next(e);
					}catch(e){
						console.error('Express error mechanism failed.\n', e.stack);
						res.statusCode = 500;
						res.setHeader('content-type', 'text/plain');
						res.end('Server error.');
					}
				}catch(ee){
					console.error('Unable to send 500 response.\n', ee.stack);
				}
			});

			domain.add(req);
			domain.add(res);

			domain.run(next);
		})
		.use(function(req, res, next){
			res.locals.showTests = app.get('env') !== 'production' &&
					req.query.test === '1';
			next();
		})
		.use(function(req, res, next){
			if(!res.locals.partials) res.locals.partials = {};
			res.locals.partials.weatherContext = database.getWeatherData();
			next();
		})
		.use(bodyParser.urlencoded({ extended: true}))
		.use(bodyParser.json())
		// jquery file upload 
		.use('/upload', function(req, res, next){
			var now = Date.now();
			jqupload.fileHandler({
				uploadDir: function(){
					return __dirname + '/public/uploads/' + now;
				},
				uploadUrl: function(){
					return '/uploads/' + now;
				},
			})(req, res, next);
		})
		.use(require('cookie-parser')(credentials.cookieSecret))
		.use(require('express-session')({
			resave: false,
			saveUninitialized: false,
			secret: credentials.cookieSecret,
			store: sessionStore
		}))
		.use(function(req, res, next){
			res.locals.flash = req.session.flash;
			delete req.session.flash;
			next();
		})
		.use(function(req, res, next){
			var cluster = require('cluster');
			if(cluster.isWorker) console.log('Worker %d received request',
				cluster.worker.id);
				next();
		})
		// handle admin sub domain
		.use(vhost('admin.*', admin))
		.use('/api', require('cors')())
		.use(function(req, res, next){
			var now = new Date();
			// console.log(now.getMonth());
			// console.log(now.getDate());
			res.locals.logoImage = now.getMonth()==9 && now.getDate()==6 ?
					static('/img/logo_jini.png') :
					static('/img/logo.png');
			next();
		})
		// middleware to provide cart data for header
		.use(function(req, res, next){
			console.log(req.session.cart);
			var cart = req.session.cart;
			res.locals.cartItems = cart && cart.items ? cart.items.length : 0;
			next();
		})
		.use(rest.rester(apiOptions))
		.use(bundler);


	// make sample data for database
	Vacation.find(function(err, vacations){
		if(err) return console.error(err);
		if(vacations.length) return;

		new Vacation({
			name: 'Hood River Day Trip',
			slug: 'hood-river-day-trip',
			category: 'Day Trip',
			sku: 'HR199',
			description: 'Spend a day sailing on the Columbia and ' +
				'enjoying craft beers in Hood River!',
			priceInCents: 9995,
			tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
			inSeason: true,
			maximumGuests: 16,
			available: true,
			packagesSold: 0,
		}).save();

		new Vacation({
			name: 'Oregon Coast Getaway',
			slug: 'oregon-coast-getaway',
			category: 'Weekend Getaway',
			sku: '0C39',
			description: 'Enjoy the ocean air and quaint coastal towns!',
			priceInCents: 269995,
			tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
			inSeason: false,
			maximumGuests: 8,
			available: true,
			packagesSold: 0,
		}).save();

		new Vacation({
			name: 'Rock Climbing in Bend',
			slug: 'rock-climbing-in-bend',
			category: 'Adventure',
			sku: 'B99',
			description: 'Experience the thrill of climbing in the high desert.',
			priceInCents: 289995,
			tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
			inSeason: true,
			requiresWaiver: true,
			maximumGuests: 4,
			available: false,
			packagesSold: 0,
			notes: 'The tour guide is currently recovering from a skiing accident.',
		}).save();	
	});

// routes
require('./routes.js')(app);

// auto view rendering
var autoViews = {};
var fs = require('fs');

app.use(function(req, res, next){
	var path = req.path.toLowerCase();
	if(autoViews[path]) return res.render(autoViews[path]);
	if(fs.existsSync(__dirname + '/views' + path + '.handlebars')){
		autoViews[path] = path.replace(/^\//, '');
		return res.render(autoViews[path]);
	}
	next();
});


// rest api
// require('./api-routes.js')(app);
// 위의 apiOptions 부터의 코드가 반드시 아래 코드보다 위에 있어야 함
rest.get('/attractions', function(req, content, cb){
	Attraction.find({ approved: false }, function(err, attractions){
		if(err) return cb({ error: 'Internal error. '});
		cb(null, attractions.map(function(a){
			return {
				name: a.name,
				description: a.description,
				location: a.location,
			};
		}));
	});
});

rest.post('/attraction',  function(req, content, cb){
	// console.log(req.body);
	var a = new Attraction({
		name: req.body.name,	
		description: req.body.description,
		location: { lat: req.body.lat, lng: req.body.lng },
		history: {
			event: 'created',
			email: req.body.email,
			date: new Date(),
		},
		approved: false,
	});

	a.save(function(err, a){
		if(err) return cb({ error: 'Unable to add attraction.' });
		cb(null, { id: a._id });
	});
});

rest.get('/attraction/:id',  function(req, content, cb){
	Attraction.findById(req.params.id, function(err, a){
		if(err) return cb({ error: 'Unable to retrieve attraction.' });
		cb(null, {
			name: a.name,
			description: a.description,
			location: a.location,
		});
	});
});

// error handler
app
		// 404 폴백 핸들러 (미들웨어)
		.use(function(req, res, next){
			res.status(404);
			res.render('404');
		})
		// 500 에러 핸들러 (미들웨어) 
		.use(function(err, req, res, next){
			console.error(err.stack);
			res.status(500);
			res.render('500');
		});

function startServer() {
	server = app.listen(app.get('port'), function(){
		console.log('Express started in ' + app.get('env') + 
			' mode on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
	});
}

if(require.main === module){
	startServer();
}else{
	module.exports = startServer;
}

