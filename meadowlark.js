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
var csurf = require('csurf');

var Q = require('q');
var topTweets = {
	count: 10,
	lastRefreshed: 0,
	refreshInterval: 15 * 60 * 1000,
	tweets: [],
};
var twitter = require('./lib/twitter.js')({
	consumerKey: credentials.twitter.consumerKey,
	consumerSecret: credentials.twitter.consumerSecret,
});

function getTopTweets(cb){
	if(Date.now() < topTweets.lastRefreshed + topTweets.refreshInterval){
		return cb(topTweets.tweets);
	}

	twitter.search('#조덕제', topTweets.count, function(result){
		var formattedTweets = [];
		var promises = [];
		var embedOpts = { omit_script: 1 };
		result.statuses.forEach(function(status){
			var deferred = Q.defer();
			twitter.embed(status.id_str, embedOpts, function(embed){
				formattedTweets.push(embed.html);
				deferred.resolve();
			});
			promises.push(deferred.promise);
		});
		Q.all(promises).then(function(){
			topTweets.lastRefreshed = Date.now();
			cb(topTweets.tweets = formattedTweets);
		});
	});
}

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
var Dealer = require('./models/dealer.js');
var fs = require('fs');

// set up css/js bundling
var configs = require('./config.js');
var connectBunddle = require('connect-bundle');
var bundler = connectBunddle(configs);
var rest = require('connect-rest');
var apiOptions = {
	context: '/api',
	domain: require('domain').create(),
};

require('dotenv').config();


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
			// 언더그라운드에서 무료 API키를 더이상 발급해주지 않아 테스트는 못해봄 
			// 만약 키가 있다면 database.getWeatherData()를 getWeatherData()로 교체함 
			// 그럼 요청을 보낼때마다 날씨 데이터를 가져오는데 
			// 만약 날씨 데이터를 마지막으로 가져온지 1시간이 채 되지 않았으면 
			// 미들웨어 요청을 하더라도 언더그라운드 사이트에 접속하지 않고 이전 데이터를 캐쉬해서 그대로 돌려줌 
			// 1시간이 지나야 요청했을때 새로운 데이터를 가져옴 
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
		.use(csurf())
		.use(function(req, res, next){
			res.locals._csrfToken = req.csrfToken();
			next();
		})
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
		.use(bundler)
		.use(function(req, res, next){
			getTopTweets(function(tweets){
				res.locals.topTweets = tweets;
				next();
			});
		});


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


// initialize dealers
Dealer.find(function(err, dealers){
    if(dealers.length) return;
	
	new Dealer({
		name: 'Oregon Novelties',
		address1: '912 NW Davis St',
		city: 'Portland',
		state: 'OR',
		zip: '97209',
		country: 'US',
		phone: '503-555-1212',
		active: true,
	}).save();

	new Dealer({
		name: 'Bruce\'s Bric-a-Brac',
		address1: '159 Beeswax Ln',
		city: 'Manzanita',
		state: 'OR',
		zip: '97209',
		country: 'US',
		phone: '503-555-1212',
		active: true,
	}).save();

	new Dealer({
		name: 'Aunt Beru\'s Oregon Souveniers',
		address1: '544 NE Emerson Ave',
		city: 'Bend',
		state: 'OR',
		zip: '97701',
		country: 'US',
		phone: '503-555-1212',
		active: true,
	}).save();

	new Dealer({
		name: 'Oregon Goodies',
		address1: '1353 NW Beca Ave',
		city: 'Corvallis',
		state: 'OR',
		zip: '97330',
		country: 'US',
		phone: '503-555-1212',
		active: true,
	}).save();

	new Dealer({
		name: 'Oregon Grab-n-Fly',
		address1: '7000 NE Airport Way',
		city: 'Portland',
		state: 'OR',
		zip: '97219',
		country: 'US',
		phone: '503-555-1212',
		active: true,
	}).save();
});

// geocoding
function geocodeDealer(dealer){
	console.log(dealerCache.geocodeCount)
	console.log("time: ",Date.now()) // 계속 실행되는지 확인하는 코드 

	var addr = dealer.getAddress(' ');
	// 만약 주소가 변경된다면 아래조건은 만족하지 않으므로 
	// 새로 지오코딩하고 변경된 주소를 dealer.geocodedAddress 에 저장함
	if(addr === dealer.geocodedAddress) return;
	
	if(dealerCache.geocodeCount >= dealerCache.geocodeLimit){
		// 사용제한(2000번)을 다 썻더라도 하루가 지났으므로 
		// 카운트를 0으로 변경하고 계속 구글 지오코딩을 사용할 수 있음 
		if(Date.now() > dealerCache.geocodeBegin + 24 * 60 * 60 * 1000){
			dealerCache.geocodeBegin = Date.now();
			dealerCache.geocodeCount = 0;
		// 하루가 채 지나지도 않았는데 사용제한(2000번)을 다 쓴 경우에는
		// 더이상 지오코딩을 할 수 없으므로 곧바로 리턴함 
		}else{	
			return;
		}
	}
	var geocode = require('./lib/geocode.js');
	geocode(addr, function(err, coords){
		// 요청이 실패했든 성공했든 요청을 했으므로 카운팅을 해줘야 함
		dealerCache.geocodeCount++;
		if(err) return console.log('Geocoding failure for ' + addr);
		dealer.lat = coords.lat;
		dealer.lng = coords.lng;
		dealer.geocodedAddress = addr; // 이 코드가 있어야 이미 지오코딩한건 스킵할 수 있음
		dealer.save();
	});
}

// optimize performance of dealer display
function dealersToGoogleMaps(dealers){
    var js = 'function addMarkers(map){\n' +
        'var markers = [];\n' +
        'var Marker = google.maps.Marker;\n' +
        'var LatLng = google.maps.LatLng;\n';
    dealers.forEach(function(d){
        var name = d.name.replace(/'/, '\\\'')
            .replace(/\\/, '\\\\');
        js += 'markers.push(new Marker({\n' +
                '\tposition: new LatLng(' +
                    d.lat + ', ' + d.lng + '),\n' +
                '\tmap: map,\n' +
                '\ttitle: \'' + name.replace(/'/, '\\') + '\',\n' +
            '}));\n';
    });
    js += '}';
    return js;
}

var dealerCache = {
	lastRefreshed: 0,
	refreshInterval: 5 * 1000, // 1000 = 1초
	jsonUrl: '/dealers.json',
	geocodeLimit: 2000,
	geocodeCount: 0,
	geocodeBegin: 0,
};
dealerCache.jsonFile = __dirname + 
		'/public' + dealerCache.jsonUrl;

dealerCache.refresh = function(cb){
	console.log('-----------------------')
	console.log('refresh start!')
	console.log('-----------------------')

	if(Date.now() >= dealerCache.lastRefreshed + dealerCache.refreshInterval){
		// 지오코딩을 새로 하고 캐쉬파일을 새로 업데이트함
		Dealer.find({active: true}, function(err, dealers){
			if(err) return console.log('Error fetching dealers: ' + err);
			
			// 좌표가 최신이라면 geocodeDealer 는 아무일도 하지않음 
			dealers.forEach(geocodeDealer);
			//  지오코딩 결과를 캐쉬파일에 업데이트함 
			fs.writeFileSync(
				dealerCache.jsonFile, JSON.stringify(dealers)
			);
			fs.writeFileSync(__dirname + '/public/js/dealers-googleMapMarkers.js', dealersToGoogleMaps(dealers));
			dealerCache.lastRefreshed = Date.now();

			console.log('-----------------------')
			console.log('refresh ended...')
			console.log('-----------------------')
			cb();
		});
	}
};

function refreshDealerCacheForever(){
	dealerCache.refresh(function(){
		setTimeout(refreshDealerCacheForever,
			dealerCache.refreshInterval);
	});
}
if(!fs.existsSync(dealerCache.jsonFile)) 
	fs.writeFileSync(JSON.stringify([]));
refreshDealerCacheForever();

//weather api
var getWeatherData = (function(){
	var c = {
		refreshed: 0,
		refreshing: false,
		updateFrequency: 360000,
		locations: [
			{ name: 'Portland' },
			{ name: 'Bend' },
			{ name: 'Manzanita' },
		]
	};

	return function() {
		if(!c.refreshing && Date.now() > c.refreshed + c.updateFrequency){
			c.refreshing = true;
			var promises = [];
			c.locations.forEach(function(loc){
				var deferred = Q.defer();
				var url = 'http://api.wunderground.com/api/' +
						credentials.WeatherUnderground.ApiKey + 
						'/conditions/q/OR/' + loc.name + '.json';
				http.get(url, function(res){
					var body = '';
					res.on('data', function(chunk){
						body += chunk;
					});
					res.on('end', function(){
						body = JSON.parse(body);
						loc.forecastUrl = body.current_observation.forecast_url;
						loc.iconUrl = body.current_observation.icon_url;
						loc.weather = body.current_observation.weather;
						loc.temp = body.current_observation.temperature_string;
						deferred.resolve();
					});
				});
				promises.push(deferred);
			});
			Q.all(promises).then(function(){
				c.refreshing = false;
				c.refreshed = Date.now();
			});
		}
		return { locations: c.locations };
	}
})();

getWeatherData();

// routes
require('./routes.js')(app);


// facebook login
var auth = require('./lib/auth.js')(app, {
	baseUrl: process.env.BASE_URL,
	providers: credentials.authProviders,
	successRedirect: '/account',
	failureRedirect: '/unauthorized',
});

auth.init();
auth.registerRoutes();

function customerOnly(req, res, next){
	if(req.user && req.user.role === 'customer') return next();
	res.redirect(303, '/unauthorized');
}
function employeeOnly(req, res, next){
	if(req.user && req.user.role === 'employee') return next();
	// 해커가 unathorized 페이지조차 알지 못하게 해서 보안 강화함 
	next('route'); // 404 페이지로 이동
}
function allow(roles){
	return function(req, res, next) {
		if(req.user && roles.split(',').indexOf(req.user.role) !== -1) return next();
		res.redirect(303, '/unauthorized');
	};
}
app.get('/unauthorized', function(req, res){
	res.status(403).render('unauthorized');
});

// 고객용 라우트 
app.get('/login', function(req, res){
	res.render('login');
});
app.get('/account', allow('customer,employee'), function(req, res){
	res.render('account', { user: req.user });
});

app.get('/logout', function(req, res){
	req.logout();
	// 로그아웃되면서 세션이 제거되는 시간이 필요함 
	// 세션이 제거되면 리디렉션한다 
	req.session.save(function(){
		req.session.flash = {
			type: 'success',
			intro: 'LOGOUT!',
			message: 'You logged out successfully',
		};
		res.redirect('/login');
	})
})

// 직원용 라우트 
app.get('/sales', employeeOnly, function(req, res){
	res.render('sales');
})

// auto view rendering
var autoViews = {};

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

var https = require('https');

function startServer() {
	var keyFile = __dirname + '/ssl/meadowlark.pem',
		certFile = __dirname + '/ssl/meadowlark.crt';
	if(!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
		console.error('\n\nERROR: One or both of the SSL cert or key are missing:\n' +
			'\t' + keyFile + '\n' +
			'\t' + certFile + '\n' +
			'You can generate these files using openssl; please refer to the book for instructions.\n');
		process.exit(1);
	}
	var options = {
		key: fs.readFileSync(__dirname + '/ssl/meadowlark.pem'),
		cert: fs.readFileSync(__dirname + '/ssl/meadowlark.crt')
	};
	server = https.createServer(options, app).listen(app.get('port'), function(){
		console.log('Express started in ' + app.get('env') + 
			' mode on https://localhost:' + app.get('port') + ' using HTTPS.; press Ctrl-C to terminate.');
	});
}

if(require.main === module){
	startServer();
}else{
	module.exports = startServer;
}

