var Vacation = require('../models/vacation.js');
var VacationInSeasonListener = require('../models/vacationInSeasonListener.js');
var helpers = require('../helpers.js');

exports.list = function(req, res){
	Vacation.find({ available: true }, function(err, vacations){
		// console.log(vacations.length);
		var currency = req.session.currency || 'USD';
		var context = {
			vacations: vacations.map(function(vacation){
				return {
					sku: vacation.sku,
					name: vacation.name,
					description: vacation.description,
					price: helpers.convertFromUSD(vacation.priceInCents/100, currency),
					inSeason: vacation.inSeason,
				}
			})
		};
		switch(currency){
			case 'USD': context.currencyUSD = 'selected'; break;
			case 'GBP': context.currencyGBP = 'selected'; break;
			case 'BTC': context.currencyBTC = 'selected'; break;
		}
		res.render('vacations/vacations', context);
	})
}

exports.notify = function(req, res){
	res.render('vacations/notify-me-when-in-season', { sku: req.query.sku });
}

exports.notifyPost = function(req, res){
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
				message: 'You will be notified when this vacation is in season.',
			};
			return res.redirect(303, '/vacations');
		}
	)
}

exports.setCurrency = function(req, res){
	req.session.currency = req.params.currency;
	return res.redirect(303, '/vacations');
}