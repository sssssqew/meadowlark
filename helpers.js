exports.specials = function specials(req, res, next){
	// res.locals.specials = getSpecialsFromDatabase();
	res.locals.specials = [
		{name: 'Seoul', price: 300},
		{name: 'Deajoen', price: 170},
		{name: 'Suwon', price: 240},
	];
	next();
}

// 화폐단위 변환 
exports.convertFromUSD = function convertFromUSD(value, currency){
	switch(currency){
		case 'USD': return value * 1;
		case 'GBP': return value * 0.6;
		case 'BTC': return value * 0.0023707918444761;
		default: return NaN;
	}
}

exports.saveContestEntry = function saveContestEntry(contenstName, email, year, month, photoPath){
	// TODO 
}
