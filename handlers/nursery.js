exports.nurseryRhyme = function(req, res){
	res.render('nursery/nursery-rhyme');
}

exports.nurseryRhymeData = function(req, res){
	res.json({
		animal: 'squirrel',
		bodyPart: 'tail',
		adjective: 'bushy',
		noun: 'heck',
	})
}