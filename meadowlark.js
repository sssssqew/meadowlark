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
				}
			}
}),
fortune = require('./lib/fortune.js'),
database = require('./database.js'),
formidable = require('formidable'),
jqupload = require('jquery-file-upload-middleware'),
credentials = require('./credentials.js'),
VALID_EMAIL_REGEX = new RegExp(
	'^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
),
emailService = require('./lib/email.js')(credentials),
fs = require('fs'),
dataDir = __dirname + '/data',
vacationPhotoDir = dataDir + '/vacation-photo',


// set database 
mongoose = require('mongoose'),
db = mongoose.connection,
Vacation = require('./models/vacation.js'),
VacationInSeasonListener = require('./models/vacationInSeasonListener.js'),
MongoSessionStore = require('session-mongoose')(require('connect'));

var sessionStore = new MongoSessionStore({
	connection: db
});

db.on('error', console.error);
db.once('open', () => { console.log('Connected to mongo db server'); });

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

	
})

// set filesystem
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);



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

function getWeatherData(){
	return {
		locations: [
			{
				name: 'Portland',
				forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
				weather: 'Overcast',
				temp: '54.1 F (12.3 C)',
			},
			{
				name: 'Bend',
				forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
				weather: 'Partly Cloudy',
				temp: '55.0 F (12.8 C)',
			},
			{
				name: 'Manzanita',
				forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
				weather: 'Light Rain',
				temp: '55.0 F (12.8 C)',
			},
		]
	}
}

// 화폐단위 변환 
function convertFromUSD(value, currency){
	switch(currency){
		case 'USD': return value * 1;
		case 'GBP': return value * 0.6;
		case 'BTC': return value * 0.0023707918444761;
		default: return NaN;
	}
}

function saveContestEntry(contenstName, email, year, month, photoPath){
	// TODO 
}

var server;

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
						next(err);
					}catch(err){
						console.error('Express error mechanism failed.\n', err.stack);
						res.statusCode = 500;
						res.setHeader('content-type', 'text/plain');
						res.end('Server error.');
					}
				}catch(err){
					console.error('Unable to send 500 response.\n', err.stack);
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
			res.locals.partials.weatherContext = getWeatherData();
			next();
		})
		.use(require('body-parser').urlencoded({ extended: true}))
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
		

// routing
app
		.get('/', function(req, res){
			req.session.cart = {
				packages: [
					{
						location: 'Seattle',
						price: '$330'
					},
					{
						location: 'New York',
						price: '$270'
					},
					{
						location: 'Sanfransisco',
						price: '$570'
					},
				]
			}
			res.render('home');
		})
		.get('/about', function(req, res){
			res.render('about', { 
				fortune: fortune.getFortune(),
				pageTestScript: '/qa/tests-about.js' 
			});
		})
		.get('/tours/hood-river', function(req, res){
			res.render('tours/hood-river');
		})
		.get('/tours/oregon-coast', function(req, res){
			res.render('tours/oregon-coast');
		})
		.get('/tours/request-group-rate', function(req, res){
			res.render('tours/request-group-rate');
		})
		.get('/tours/product-list', function(req, res){
			res.render('tours/product-list', database.product)
		})
		.get('/jquery-test', function(req, res){
			res.render('jquery-test')
		})
		.get('/headers', function(req, res){
			res.set('Content-Type', 'text/plain');
			var s = '* client header information*\n\n';
			for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
				res.send(s);
		})
		.get('/nursery-rhyme', function(req, res){
			res.render('nursery-rhyme');
		})
		.get('/data/nursery-rhyme', function(req, res){
			res.json({
				animal: 'squirrel',
				bodyPart: 'tail',
				adjective: 'bushy',
				noun: 'heck',
			})
		})
		.get('/newsletter', function(req, res){
			res.render('newsletter', { csrf: 'CSRF token goes here' });
		})
		.post('/process', function(req, res){

			var name = req.body.name || '', email = req.body.email || '';
			if(!email.match(VALID_EMAIL_REGEX)){
				if(req.xhr) return res.json({ error: 'Invalid email address.' });
				req.session.flash = {
					type: 'danger',
					intro: 'Validation error! ',
					message: 'The email address you entered was not valid.',
				};
				return res.redirect(303, '/newsletter');
			}

			
		})
		.get('/thank-you', function(req, res){
			res.render('thank-you');
		})
		.get('/newsletter-ajax', function(req, res){
			res.render('newsletter-ajax', { csrf: 'CSRF token goes here' });
		})
		.get('/contest/vacation-photo', function(req, res){
			var now = new Date();
			res.render('contest/vacation-photo', {
				year: now.getFullYear(),
				month: now.getMonth()
			});
		})
		.post('/contest/vacation-photo/:year/:month', function(req, res){
			var form = new formidable.IncomingForm();
			form.parse(req, function(err, fields, files){
				// if(err) return res.redirect(303, '/error');
				if(err){
					res.session.flash = {
						type: 'danger',
						intro: 'Oops!',
						message: 'There was an error processing your submission. ' +
						'Please try again.',
					};
					return res.redirect(303, '/contenst/vacation-photo');
				}
				var photo = files.photo;
				var dir = vacationPhotoDir + '/' + Date.now();
				var path = dir + '/' + photo.name;
				fs.mkdirSync(dir);
				fs.renameSync(photo.path, path);
				saveContestEntry('vacation-photo', fields.email, 
					req.params.year, req.params.month, path);
				req.session.flash = {
					type: 'success',
					intro: 'Good luck!',
					message: 'You hav been entered into the contest.',
				};
				return res.redirect(303, '/contest/vacation-photo/entries');
			});
		})
		.get('/contest/vacation-photo-jquery', function(req, res){
			res.render('contest/vacation-photo-jquery');
		})
		.get('/error', function(req, res){
			res.render('error');
		})
		.get('/cart/checkout', function(req, res, next){
			var cart = req.session.cart;
			if(!cart) next();
			res.render('cart-checkout', { cart: cart });
		})
		.post('/cart/checkout', function(req, res){
			var cart = req.session.cart;
			if(!cart) next(new Error('Cart does not exist.'));
			var name = req.body.name || '', email = req.body.email || '';
			if(!email.match(VALID_EMAIL_REGEX))
				return res.next(new Error('Invalid email address.'));
			cart.number = Math.random().toString().replace(/^0\.0*/, '');
			cart.billing = { 
				name: name,
				email: email,
			};
			res.render('email/cart-thank-you',
				{ layout: null, cart: cart }, function(err, html){
					if(err) console.log('error in email template');
					emailService.send(cart.billing.email, '[안녕하세요] 여행 가입을 축하드립니다 !!', html);
				}
			);
			res.render('cart-thank-you', { cart: cart });
		})
		.get('/fail', function(req, res){
			throw new Error('Nope!');
		})
		.get('/epic-fail', function(req, res){
			process.nextTick(function(){
				throw new Error('Kaboom!');
			})
		})
		.get('/vacations', function(req, res){
			Vacation.find({ available: true }, function(err, vacations){
				// console.log(vacations.length);
				var currency = req.session.currency || 'USD';
				var context = {
					vacations: vacations.map(function(vacation){
						return {
							sku: vacation.sku,
							name: vacation.name,
							description: vacation.description,
							price: convertFromUSD(vacation.priceInCents/100, currency),
							inSeason: vacation.inSeason,
						}
					})
				};
				switch(currency){
					case 'USD': context.currencyUSD = 'selected'; break;
					case 'GBP': context.currencyGBP = 'selected'; break;
					case 'BTC': context.currencyBTC = 'selected'; break;
				}
				res.render('vacations', context);
			})
		})
		.get('/notify-me-when-in-season', function(req, res){
			res.render('notify-me-when-in-season', { sku: req.query.sku });
		})
		.post('/notify-me-when-in-season', function(req, res){
			VacationInSeasonListener.update(
				{ email: req.body.email },
				{ $push: { skus: req.body.sku } },
				{ upsert: true },
				function(err){
					if(err){
						console.error(err.stack);
						req.session.flash = {
							type: 'danger',
							intro: 'Ooops!',
							message: 'There was an error processing your request.'
						};
						return res.redirect(303, '/vacations');
					}
					req.session.flash = {
						type: 'success',
						intro: 'Thank you!',
						message: 'You will be notifid when this vacation is in season.',
					};
					return res.redirect(303, '/vacations');
				}
			)
		})
		.get('/cart', function(req, res, next){
			var cart = req.session.cart;
			if(!cart) next();
			res.render('cart', { cart: cart });
		})
		// 세션 카트에 고객이 선택한 여행 패키지 상품을 추가함
		.get('/cart/add', function(req, res, next){
			if(req.session.cart) req.session.cart = {};
			var cart = req.session.cart || (req.session.cart = { items: [] });
			Vacation.findOne({ sku: req.query.sku }, function(err, vacation){
				if(err) return next(err);
				if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.query.sku));
				cart.items.push({
					vacation: vacation,
					guests: req.body.guests || 1,
				});
				res.redirect(303, '/cart');
			});
		})
		.get('/set-currency/:currency', function(req, res){
			req.session.currency = req.params.currency;
			return res.redirect(303, '/vacations');
		});



// error handling
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
		})

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

