var VALID_EMAIL_REGEX = new RegExp(
	'^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);

exports.home = function(req, res){
	res.render('newsletter/newsletter', { csrf: 'CSRF token goes here' });
}

exports.process = function(req, res){
	var name = req.body.name || '', email = req.body.email || '';
	if(!email.match(VALID_EMAIL_REGEX)){
		if(req.xhr) return res.json({ error: 'Invalid email address.' });
		req.session.flash = {
			type: 'danger',
			intro: 'Validation error! ',
			message: 'The email address you entered was not valid.',
		};
	}else{
		if(req.xhr) return res.json({ success: true });
		req.session.flash = {
			type: 'success',
			intro: 'WOW WELCOME! ',
			message: 'You successfully signed up for our newsletter.',
		};
	}
	return res.redirect(303, 'newsletter');
}

exports.processAjax = function(req, res){
	res.render('newsletter/newsletter-ajax', { csrf: 'CSRF token goes here' });
}