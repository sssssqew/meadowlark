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
jqupload = require('jquery-file-upload-middleware');

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
		});

// routing
app
		.get('/', function(req, res){
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
			console.log('Form (from querystring): ' + req.query.form);
			console.log('CSRF token (from hidden form field): ' + req.body._csrf);
			console.log('Name (from visible form field): ' + req.body.name);
			console.log('Email (from visible form field): ' + req.body.email);
			if(req.xhr || req.accepts('json,html')==='json'){
				res.send({ success: true });
			}else{
				res.redirect(303, '/thank-you');
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


app.listen(app.get('port'), function(){
	console.log('Express started on https://localhost: ' +
		app.get('port') + '; press Ctrl-C to terminate.');
});