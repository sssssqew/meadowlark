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
				file: '/css/meadowlark.min.cc3a44bd.css',
				contents: [
					'/css/main.css',
					'/css/cart.css',
				]
			}
		}
	}
}