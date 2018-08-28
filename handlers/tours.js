var database = require('../database.js');

exports.hoodRiver = function(req, res){
	res.render('tours/hood-river');
}

exports.oregonCoast = function(req, res){
	res.render('tours/oregon-coast');
}

exports.requestGroupRate = function(req, res){
	res.render('tours/request-group-rate');
}

exports.productList = function(req, res){
	res.render('tours/product-list', database.product)
}