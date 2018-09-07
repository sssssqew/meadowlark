var _ = require('underscore');

function smartJoin(arr, separator){
	if(!separator) separator = ' ';
	return arr.filter(function(elt){
		return elt!==undefined &&
				elt!==null &&
				elt.toString().trim() !== '';
	}).join(separator);
}
function getCustomerViewModel(customer, orders){
	var vm = _.omit(customer, 'salesNotes');
	return _.extend(vm, {
		name: smartJoin([vm.firtName, vm.lastName]),
		fullAddress: smartJoin([
			customer.address1,
			customer.address2,
			customer.city + ', ' +
			customer.state + ' ' +
			customer.zip,
		], '<br>'),
		orders: orders.map(function(order){
			return {
				orderNumber: order.orderNumber,
				date: order.date,
				status: order.status,
				url: '/orders/' + order.orderNumber,
			};
		}),
	});
}

module.exports = getCustomerViewModel;