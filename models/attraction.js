var mongoose = require('mongoose');

var attactionSchema = mongoose.Schema({
	name: String,
	description: String,
	location: { lat: Number, lng: Number },
	history: {
		event: String,
		notes: String,
		email: String,
		date: Date,
	},
	updateId: String,
	approved: Boolean,
});
var Attraction = mongoose.model('Attraction', attactionSchema);
module.exports = Attraction;