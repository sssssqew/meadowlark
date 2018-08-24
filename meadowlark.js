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
emailService = require('./lib/email.js')(credentials);


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

// config and middleware
app
		.use(express.static(__dirname + '/public'))
		.set('port', process.env.PORT || 3000)
		.engine('handlebars', handlebars.engine)
		.set('view engine', 'handlebars')
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
			secret: credentials.cookieSecret
		}))
		.use(function(req, res, next){
			res.locals.flash = req.session.flash;
			delete req.session.flash;
			next();
		})
		.use(function(req, res, next){
			console.log('processing request for "' + req.url + '"....');
			next();
		})
		// .use(cartValidation.checkWaivers)
		// .use(cartValidation.checkGuestCounts);

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
				if(err) return res.redirect(303, '/error');
				console.log('received fields:');
				console.log(fields);
				console.log('received files:');
				console.log(files);
				res.redirect(303, '/thank-you');
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

		// 미들웨어 실습 
		// .use(function(req, res, next){
		// 	console.log('\n\nALLWAYS');
		// 	next();
		// })
		// .get('/a', function(req, res){
		// 	console.log('/a: route terminated');
		// 	res.send('a');
		// })
		// .get('/a', function(req, res){
		// 	console.log('/a: never called');
		// })
		// .get('/b', function(req, res, next){
		// 	console.log('/b: route not terminated');
		// 	next();
		// })
		// .use(function(req, res, next){
		// 	console.log('SOMETIMES');
		// 	next();
		// })
		// .get('/b', function(req, res, next){
		// 	console.log('/b (part 2): error thrown');
		// 	throw new Error('b failed');
		// })
		// .use('/b', function(err, req, res, next){
		// 	console.log('/b error detected and passed on');
		// 	next(err);
		// })
		// .get('/c', function(err, req){
		// 	console.log('/c: error thrown');
		// 	throw new Error('c failed');
		// })
		// .use('/c', function(err, req, res, next){
		// 	console.log('/c: error detected but not passed on');
		// 	next();
		// })
		// .use(function(err, req, res, next){
		// 	console.log('unhandled error detected: ' + err.message);
		// 	res.send('500 - server error');
		// })
		// .use(function(req, res){
		// 	console.log('route not handled');
		// 	res.send('404 - not found');
		// })



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


app.listen(app.get('port'), function(){
	console.log('Express started on https://localhost: ' +
		app.get('port') + '; press Ctrl-C to terminate.');
});