public with sharing class UnsplashService {
	private static final String CMD_NAME = 'Unsplash_API'; // developer name записи CustomMetadata

	// @AuraEnabled позволяет вызвать этот метод из LWC
	@AuraEnabled
	public static String fetchImageByQuery(String query) {
		if (String.isBlank(query)) return null;

		// Чтение записи Custom Metadata
		External_API__mdt md = External_API__mdt.getInstance(CMD_NAME);
		String accessKey = (md != null) ? md.AccessKey__c : null;

		// Формируем endpoint для Unsplash API
		String encodedQuery = EncodingUtil.urlEncode(query, 'UTF-8');
		String endpoint = 'https://api.unsplash.com/search/photos?query=' + encodedQuery + '&per_page=1';

		// Создание запроса HTTP
		HttpRequest req = new HttpRequest();
		req.setEndpoint(endpoint);
		req.setMethod('GET');
		// Добавляем заголовок для авторизации
		if (!String.isBlank(accessKey)) {
			req.setHeader('Authorization', 'Client-ID ' + accessKey);
		}

		// Отправляем запрос и обрабатываем ответ
		Http http = new Http();
		try {
			HttpResponse res = http.send(req);
			if (res.getStatusCode() >= 200 && res.getStatusCode() < 300) {
				// Парсим тело ответа
				Map<String,Object> parsedResponse = (Map<String,Object>) JSON.deserializeUntyped(res.getBody());
				List<Object> results = (List<Object>) parsedResponse.get('results');
				if (results != null && !results.isEmpty()) {
					// Извлекаем URL изображения из ответа
					Map<String,Object> firstResult = (Map<String,Object>) results[0];
					Map<String,Object> urls = (Map<String,Object>) firstResult.get('urls');
					if (urls != null) {
						if (urls.containsKey('regular')) return (String) urls.get('regular');
						if (urls.containsKey('full')) return (String) urls.get('full');
						if (urls.containsKey('raw')) return (String) urls.get('raw');
					}
				}
			} else {
				System.debug('Unsplash returned status ' + res.getStatusCode() + ' body: ' + res.getBody());
			}
		} catch (Exception e) {
			System.debug('Unsplash callout error: ' + e.getMessage());
		}
		return null;
	}
}
