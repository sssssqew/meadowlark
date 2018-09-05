// nvm use v8 to use connect-rest package
var express = require('express');
var app = express();
var vhost = require('vhost');
var handlebars = require('express-handlebars')
		.create({ 
			defaultLayout:'main',
			helpers: {
				section: function(name, options){
					if(!this._sections) this._sections = {};
					this._sections[name] = options.fn(this);
					return null;
				}
			}
});


var Attraction = require('./models/attraction.js');


var credentials = require('./credentials.js');


// set database 
mongoose = require('mongoose'),
db = mongoose.connection,

MongoSessionStore = require('session-mongoose')(require('connect'));

var sessionStore = new MongoSessionStore({
	connection: db
});

var rest = require('connect-rest');

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

app
		.use(express.static(__dirname + '/public'))
		.set('port', process.env.PORT || 3000)
		.engine('handlebars', handlebars.engine)
		.set('view engine', 'handlebars')
		// postman으로 api 테스트 할때 json 객체를 보냄 
		// tests-api.js 코드에서도 json 객체를 보냄 
		.use(require('body-parser').json());




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

// app.use(vhost('api.*', rest.rester(apiOptions)));
app.use(rest.rester(apiOptions));
// 위의 apiOptions 부터의 코드가 반드시 아래 코드보다 위에 있어야 함


rest.get('/attractions', function(req, content, cb){
	Attraction.find({ approved: false }, function(err, attractions){
		if(err) return cb({ error: 'Internal error. '});
		cb(null, attractions.map(function(a){
			return {
				name: a.name,
				description: a.description,
				location: a.location,
			}
		}));
	})
})

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
	})
})

rest.get('/attraction/:id',  function(req, content, cb){
	Attraction.findById(req.params.id, function(err, a){
		if(err) return cb({ error: 'Unable to retrieve attraction.' });
		cb(null, {
			name: a.name,
			description: a.description,
			location: a.location,
		});
	})
})






// // error handler
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


var server;
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