var mongoose = require('mongoose');
var userSchema = mongoose.Schema({
	authId: String, // 타사 ID와 연결 
	name: String,
	email: String,
	role: String, // 고객 or 직원
	created: Date,
});
var User = mongoose.model('User', userSchema);
module.exports = User;
