var assert = require('chai').assert;
var http = require('http');
var rest = require('restler');

suite('API tests', function(){
	var attraction = {
		lat: 45.516011,
		lng: -122.682062,
		name: 'Portland Art Museum',
		description: 'Founded in 1892, the Porland Art Museum\'s collection ' +
						'of native art is not to be missed. If modern art is more to your ' +
						'liking, there are six stories of modern art for your enjoyment.',
		email: 'test@meadowlarktravel.com',
	};

	var base = 'http://localhost:3000';

	test('should be able to add an attraction', function(done){
		rest.postJson(base + '/api/attraction', attraction).on('success',
			function(data){
				assert.match(data.id, /\w/, 'id must be set');
				done();
			});
		
	});
	test('should be able to retrieve an attraction', function(done){
		// test db 를 사용하기 때문에 test 시작시에는
		// 반드시 사용할 데이터를 넣어주고 읽어야 함 
		rest.postJson(base + '/api/attraction', attraction).on('success',
			function(data){
				rest.get(base + '/api/attraction/' + data.id).on('success',
					function(data){
						// console.log(data);
						assert(data.name === attraction.name);
						assert(data.description === attraction.description);
						done();
					})
			});
		
	})
})