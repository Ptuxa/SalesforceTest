@IsTest
global class UnsplashMock implements HttpCalloutMock {
	global HTTPResponse respond(HTTPRequest req) {
		// Создаём фиктивный HTTP-ответ
		HttpResponse res = new HttpResponse();
		res.setStatusCode(200);
		// Имитация тела ответа от Unsplash API
		String body = '{ "results": [ { "urls": { "regular": "https://images.example.com/sample.jpg" } } ] }';
		res.setBody(body);
		return res;
	}
}