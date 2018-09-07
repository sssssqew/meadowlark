var Customer = require('../models/customer.js');
var customerViewModel = require('../viewModels/customer.js');

exports = {
	registerRoutes: function(app) {
		app.get('/customer/register', this.register);
		app.post('/customer/register', this.processRegister);

		app.get('/customer/:id', this.home);
		app.get('/customer/:id/preferences', this.preferences);
		app.get('/orders/:id', this.orders);

		app.post('/customer/:id/update', this.ajaxUpdate);
	},
	
	register: function(req, res, next){
		res.render('customer/register');
	},

	processRegister: function(req, res, next) {
		var c = new Customer({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			address1: req.body.address1,
			address2: req.body.address2,
			city: req.body.city,
			state: req.body.state,
			zip: req.body.zip,
			phone: req.body.phone,
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/customer/' + c._id);
		});
	},

	home: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer){
			if(err) return next(err);
			if(!customer) return next(); // 404 핸들러로 전달 
			customer.getOrders(function(err, orders){
				if(err) return next(err);
				res.render('customer/home', 
									customerViewModel(customer, orders));
			});
		});
	},

	preferences: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer){
			if(err) return next(err);
			if(!customer) return next();
			customer.getOrders(function(err, orders){
				if(err) return next(err);
				res.render('customer/preferences',
									customerViewModel(customer, orders));
			});
		});
	},

	orders: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer){
			if(err) return next(err);
			if(!customer) return next();
			customer.getOrders(function(err, orders){
				if(err) return next(err);
				res.render('customer/preferences', 
									customerViewModel(customer, orders));
			});
		});
	},
	
	// 고객정보 업데이트
	ajaxUpdate: function(req, res) {
		Customer.findById(req.params.id, function(err, customer){
			if(err) return next(err);
			if(!customer) return next();
			if(req.body.firstName) {
				if(typeof req.body.firstName !== 'string' ||
						req.body.firstName.trim() === '')
					return res.json({ error: 'Invalid name.' });
				customer.firstName = req.body.firstName;
			}
			// 기타 등등...
			customer.save(function(err){
				return err ? 
						res.json({ error: 'Unable to update customer info.' }) :
						res.json({ success: true });
			});
		});
	},
};