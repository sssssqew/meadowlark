var fortune = require('../lib/fortune.js');
var database = require('../database.js');

exports.home = function(req, res){
	res.render('home');
};

exports.about = function(req, res){
	res.render('about', { 
		fortune: fortune.getFortune(),
		pageTestScript: '../qa/tests-about.js' 
	});
};

exports.jqueryTest = function(req, res){
	res.render('jquery-test')
}

exports.headers = function(req, res){
	res.set('Content-Type', 'text/plain');
	var s = '* client header information*\n\n';
	for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
		res.send(s);
}

exports.error = function(req, res){
	res.render('error');
}

exports.fail = function(req, res){
	throw new Error('Nope!');
}

exports.epicFail = function(req, res){
	process.nextTick(function(){
		throw new Error('Kaboom!');
	})
}

exports.getSpecial = function(req, res){
	res.render('page-with-specials');
}

exports.getStaff = function(req, res, next){
	var staff = database.staff;
	
	try{
		var info = staff[req.params.city][req.params.name];
	}catch(e){
		var info = undefined;
	}
	if(!info) return next();
	res.json(info);
}