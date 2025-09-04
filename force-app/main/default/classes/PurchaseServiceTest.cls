@isTest
private class PurchaseServiceTest {
	@isTest static void testCreatePurchaseWithLines_withMap() {
		// подготовка данных
		Account acc = new Account(Name = 'Test Account');
		insert acc;

		Item__c item = new Item__c(Name = 'Test Item', Price__c = 111, Account__c = acc.Id);
		insert item;

		// формируем список Map<String,Object>
		List<Map<String,Object>> lines = new List<Map<String,Object>>();
		Map<String,Object> m = new Map<String,Object>{
		'itemId'   => item.Id,
		'amount'   => 2,
		'unitCost' => 111
		};
		lines.add(m);

		Test.startTest();
		Id purchaseId = PurchaseService.createPurchaseWithLines(acc.Id, lines);
		Test.stopTest();

		System.assertNotEquals(null, purchaseId, 'Purchase should be created');

		Purchase__c p = [SELECT Id, ClientId__c FROM Purchase__c WHERE Id = :purchaseId LIMIT 1];
		System.assertEquals(acc.Id, p.ClientId__c);

		List<PurchaseLine__c> pls = [SELECT Id, ItemId__c, Amount__c, UnitCost__c FROM PurchaseLine__c WHERE PurchaseId__c = :purchaseId];
		System.assertEquals(1, pls.size());
		System.assertEquals(item.Id, pls[0].ItemId__c);
	}
}
