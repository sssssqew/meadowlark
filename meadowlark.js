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
database = require('./database.js');

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
		});
		
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


app.listen(app.get('port'), function(){
	console.log('Express started on https://localhost: ' +
		app.get('port') + '; press Ctrl-C to terminate.');
});