var VALID_EMAIL_REGEX = new RegExp(
	'^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);
var credentials = require('../credentials.js');
var emailService = require('../lib/email.js')(credentials);
var Vacation = require('../models/vacation.js');

function addToCart(sku, guests, req, res, next){
	var cart = req.session.cart || (req.session.cart = { items: [] }); // 좋은 코드
	Vacation.findOne({ sku: req.query.sku }, function(err, vacation){
		if(err) return next(err);
		if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.query.sku));
		cart.items.push({
			vacation: vacation,
			guests: req.body.guests || 1,
			sku: sku
		});
		res.redirect(303, '/cart'); // 미들웨어를 거침 
	});
}

exports.checkoutHome = function(req, res, next){
	var cart = req.session.cart;
	if(!cart) next();
	res.render('cart/cart-checkout', { cart: cart });
}

exports.checkoutPost = function(req, res, next){
	var cart = req.session.cart;
	if(!cart) next(new Error('Cart does not exist.'));
	var name = req.body.name || '', email = req.body.email || '';
	if(!email.match(VALID_EMAIL_REGEX))
		return next(new Error('Invalid email address.'));
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
	res.render('cart/cart-thank-you', { cart: cart });
}

exports.Home = function(req, res, next){
	var cart = req.session.cart;
	if(!cart) next();
	res.render('cart/cart', { cart: cart });
}

exports.add = function(req, res, next){
	addToCart(req.query.sku, req.query.guests, req, res, next);
};

exports.addPost = function(req, res, next){
	addToCart(req.body.sku, req.body.guests, req, res, next);
};