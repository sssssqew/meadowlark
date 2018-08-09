// 진입점 (entry point)
var express = require('express'),
app = express(),
// 핸들바 뷰 엔진 설정 
handlebars = require('express-handlebars')
		.create({ defaultLayout:'main' }),
fortune = require('./lib/fortune.js');


app
		.use(express.static(__dirname + '/public'))
		.set('port', process.env.PORT || 3000)
		.engine('handlebars', handlebars.engine)
		.set('view engine', 'handlebars')
		.use(function(req, res, next){
			res.locals.showTests = app.get('env') !== 'production' &&
					req.query.test === '1';
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
		.get('/headers', function(req, res){
			res.set('Content-Type', 'text/plain');
			var s = '* client header information*\n\n';
			for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
				res.send(s);
		});


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