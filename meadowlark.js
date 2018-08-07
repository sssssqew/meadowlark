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
		.set('view engine', 'handlebars');


app
		.get('/', function(req, res){
			res.render('home');
		})
		.get('/about', function(req, res){
			res.render('about', { fortune: fortune.getFortune() });
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