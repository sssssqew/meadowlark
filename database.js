var product = {
	currency: {
		name: 'United Staate dollars',
		abbrev: 'USD',
	},
	tours: [
		{ name: 'Hood River', price: '$99.95'},
		{ name: 'Oregon Coast', price: '$159.95'},
	],
	specialsUrl: '/january-specials',
	currencies: ['USD', 'GBP', 'BTC'],
	name: '<b>Buttercup</b>'
}

var staff = {
	Seoul: {
		sylee: { bio: 'very genius', age: '34' },
		sssssqew: { bio: 'goes to naver', age: '24' },
		bruce: { bio: 'do well in martial art', age: '27' },
	},
	Deajun: {
		walt: { bio: 'Walt is expert.', age: '54'}
	}	
}

exports.product = product;
exports.staff = staff;

exports.getWeatherData = function getWeatherData(){
	return {
		locations: [
			{
				name: 'Portland',
				forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
				weather: 'Overcast',
				temp: '54.1 F (12.3 C)',
			},
			{
				name: 'Bend',
				forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
				weather: 'Partly Cloudy',
				temp: '55.0 F (12.8 C)',
			},
			{
				name: 'Manzanita',
				forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
				weather: 'Light Rain',
				temp: '55.0 F (12.8 C)',
			},
		]
	}
}