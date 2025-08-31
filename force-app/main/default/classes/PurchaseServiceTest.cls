@IsTest
private class PurchaseServiceTest {
	@IsTest static void testCreatePurchaseWithLines() {
		// Prepare data
		Account acc = new Account(Name='Test Account');
		insert acc;

		Item__c item = new Item__c(Name='TstItem', Price__c = 10.00);
		insert item;

		// Prepare DTO list for PurchaseService
		List<PurchaseService.PurchaseLineInput> lines = new List<PurchaseService.PurchaseLineInput>();
		PurchaseService.PurchaseLineInput li = new PurchaseService.PurchaseLineInput();
		li.itemId = item.Id;
		li.amount = 2;
		li.unitCost = 10.00;
		lines.add(li);

		Test.startTest();
		Id purchaseId = PurchaseService.createPurchaseWithLines(acc.Id, lines);
		Test.stopTest();

		// Verify Purchase and totals (trigger should have filled totals)
		Purchase__c p = [SELECT Id, TotalItems__c, GrandTotal__c FROM Purchase__c WHERE Id = :purchaseId LIMIT 1];
		System.assertEquals(2, Integer.valueOf(p.TotalItems__c), 'TotalItems should be 2');
		// cast to Decimal for comparison
		System.assertEquals(Decimal.valueOf(20), p.GrandTotal__c, 'GrandTotal should be 20.00');
	}
}
