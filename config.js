module.exports = {
	bundles: {
		clientJavaScript: {
			main: {
				file: '/js.min/meadowlark.min.2aec5645.js',
				location: 'head',
				contents: [
					'/js/contact.js',
					'/js/cart.js',
				]
			}
		},

		clientCss: {
			main: {
				file: '/css/meadowlark.min.a4462858.css',
				contents: [
					'/css/main.css',
					'/css/cart.css',
				]
			}
		}
	}
}