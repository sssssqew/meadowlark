var User = require('../models/user.js'),
	passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy,
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// 세션에 사용자 ID 저장 
// req.session.passport.user로 접근
passport.serializeUser(function(user, done){
	console.log('serializeUser ', user)
	done(null, user._id);
});

// 새로고침이나 브라우저 껏다 킬때마다 사용자 반환
passport.deserializeUser(function(id, done){
	console.log('deserializeUser ', id);
	User.findById(id, function(err, user){
		if(err || !user) return done(err, null);
		done(null, user);
	});
});


module.exports = function(app, options){
	if(!options.successRedirect)
		options.successRedirect = '/account';
	if(!options.failureRedirect)
		options.failureRedirect = '/login';

	return {
		init: function() {
			var env = app.get('env');
			var config = options.providers;
			
			// console.log(options.baseUrl);
			// console.log(config.facebook[env].appId);

			passport.use(new FacebookStrategy({
				clientID: config.facebook[env].appId,
				clientSecret: config.facebook[env].appSecret,
				callbackURL: (options.baseUrl || '') + '/auth/facebook/callback', // 내 사이트의 콜백 라우트
				enableProof: true,
				profileFields: ['id', 'email', 'gender', 'link', 'locale',
    	'name', 'timezone', 'updated_time', 'verified', 'displayName']
			}, function(accessToken, refreshToken, profile, done){
				var authId = 'facebook:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user); // serializeUser 함수의 인자로 들어가는 user 
					// 페이스북에서 찾은 사용자가 db에 없으면 사용자 정보 db 저장

					user = new User({
						authId: authId,
						name: profile.displayName,
						created: Date.now(),
						role: 'customer',
					});
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

			passport.use(new GoogleStrategy({
				clientID: config.google[env].clientID,
				clientSecret: config.google[env].clientSecret,
				callbackURL: (options.baseUrl || '') + '/auth/google/callback'
			}, function(accessToken, refreshToken, profile, done){
				var authId = 'google:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						created: Date.now(),
						role: 'customer',
					});
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

			app.use(passport.initialize());
			app.use(passport.session());
		},
		registerRoutes: function() {
			app.get('/auth/facebook', function(req,res, next){
				if(req.query.redirect) 
					req.session.authRedirect = req.query.redirect;
				passport.authenticate('facebook')(req,res,next);
			});
			app.get(
				'/auth/facebook/callback',
				passport.authenticate('facebook', {
					failureRedirect: options.failureRedirect }),
				function(req, res){
					var redirect = req.session.authRedirect;
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, redirect || options.successRedirect);
				}
			);
			app.get('/auth/google', function(req, res, next){
				if(req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('google', { scope: 'profile' })(req, res, next);
			});
			app.get('/auth/google/callback', 
				passport.authenticate('google', {
					failureRedirect: options.failureRedirect }),
				function(req, res){
					var redirect = req.session.authRedirect;
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, redirect || options.successRedirect);
				}
			);
		},
	};
};


