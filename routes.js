var main = require('./handlers/main.js');
var tours = require('./handlers/tours.js');
var nursery = require('./handlers/nursery.js');
var newsletter = require('./handlers/newsletter.js');
var contest = require('./handlers/contest.js');
var cart = require('./handlers/cart.js');
var vacations = require('./handlers/vacations.js');
var helpers = require('./helpers.js');

module.exports = function(app){

app
		.get('/', main.home)
		.get('/about', main.about)
		.get('/jquery-test', main.jqueryTest)
		.get('/headers', main.headers)
		.get('/error', main.error)
		.get('/fail', main.fail)
		.get('/epic-fail', main.epicFail) // again
		.get('/staff/:city/:name', main.getStaff)
		.get('/page-with-specials', helpers.specials, main.getSpecial)


		.get('/tours/hood-river', tours.hoodRiver)
		.get('/tours/oregon-coast', tours.oregonCoast)
		.get('/tours/request-group-rate', tours.requestGroupRate)
		.get('/tours/product-list', tours.productList)


		.get('/nursery-rhyme', nursery.nurseryRhyme)
		.get('/data/nursery-rhyme', nursery.nurseryRhymeData)
		

		.get('/newsletter', newsletter.home)
		.post('/process', newsletter.process)
		.get('/newsletter-ajax', newsletter.processAjax)


		.get('/contest/vacation-photo', contest.home)
		.post('/contest/vacation-photo/:year/:month', contest.savePhoto)
		.get('/contest/vacation-photo-jquery', contest.homeJquery)
		.get('/contest/vacation-photo/entries', contest.list)


		.get('/cart', cart.Home) //^
		.get('/cart/checkout', cart.checkoutHome) //^
		.post('/cart/checkout', cart.checkoutPost) //^
		// 세션 카트에 고객이 선택한 여행 패키지 상품을 추가함
		.get('/cart/add', cart.add) //^
		// .post('/cart/add', cart.addPost) //^


		.get('/vacations', vacations.list) //^
		.get('/notify-me-when-in-season', vacations.notify) //^
		.post('/notify-me-when-in-season', vacations.notifyPost) //^
		.get('/set-currency/:currency', vacations.setCurrency) //^


		// // test sub domain
		// admin
		// 		.get('/', function(req, res){
		// 			res.send('admin home');
		// 		})
		// 		.get('/users', function(req, res){
		// 			res.send('admin users');
		// 		});
}