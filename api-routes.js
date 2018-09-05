// 데이터를 반환할때 필요한 정보만 뽑아서 새 객체로 만들어 반환함 
// DB 데이터를 그대로 반환하면 프로그램 세부 사항(DB 구조)가 외부로 노출됨
var attraction = require('./handlers/attraction.js');

module.exports = function(app){
	app
		.get('/api/attractions', attraction.list)
		.post('/api/attraction', attraction.create)
		.get('/api/attraction/:id', attraction.show);
	}