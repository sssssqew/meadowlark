var helpers = require('../helpers.js');
var formidable = require('formidable');
var fs = require('fs');
var path = require("path");
var dataDir = path.resolve(__dirname, '..') + '/public/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
var photoList = [];

exports.home = function(req, res){
	fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
	fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

	var now = new Date();
	res.render('contest/vacation-photo', {
		year: now.getFullYear(),
		month: now.getMonth()
	});
}

exports.savePhoto = function(req, res){
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		// if(err) return res.redirect(303, '/error');
		if(err){
			res.session.flash = {
				type: 'danger',
				intro: 'Oops!',
				message: 'There was an error processing your submission. ' +
				'Please try again.',
			};
			return res.redirect(303, '/contenst/vacation-photo');
		}
		
		var d = Date.now();
		var dir = vacationPhotoDir + '/' + d;
		fs.existsSync(dir) || fs.mkdirSync(dir);

		var photo = files.photo;
		var path = dir + '/' + photo.name;
		fs.renameSync(photo.path, path);
		
		// save in memory
		photoList.push({
			name: photo.name,
			url: '/data/vacation-photo/' +  d + '/' + photo.name
		});

		// // // save in database
		// // // helpers.saveContestEntry('vacation-photo', fields.email, 
		// // // 	req.params.year, req.params.month, path);

		req.session.flash = {
			type: 'success',
			intro: 'Good luck!',
			message: 'You have been entered into the contest.',
		};
		return res.redirect(303, '/contest/vacation-photo/entries');
	});
}

exports.homeJquery = function(req, res){
	res.render('contest/vacation-photo-jquery');
}

exports.list = function(req, res){
	res.render('contest/entries', { photoList: photoList });
}