@IsTest
private class UnsplashServiceTest {
	@IsTest static void testFetchImageByQuery() {
		// Настроим mock для HTTP-запроса
		Test.setMock(HttpCalloutMock.class, new UnsplashMock());

		// Запускаем тест
		Test.startTest();
		String imageUrl = UnsplashService.fetchImageByQuery('test query');
		Test.stopTest();

		// Проверяем, что возвращён правильный URL
		System.assertNotEquals(null, imageUrl);
		System.assert(imageUrl.contains('images.example.com'), 'URL should come from mock');
	}
}
