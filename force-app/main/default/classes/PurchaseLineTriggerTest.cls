@IsTest
private class PurchaseLineTriggerTest {
	@IsTest static void testTriggerRecalcOnInsertUpdateDelete() {
		// Создаём базовые данные
		Account acc = new Account(Name='Acct for Trigger');
		insert acc;

		Purchase__c p = new Purchase__c(ClientId__c = acc.Id);
		insert p;

		Item__c item = new Item__c(Name='ItemForTrigger', Price__c = 5.00);
		insert item;

		PurchaseLine__c pl = new PurchaseLine__c(
				PurchaseId__c = p.Id,
				ItemId__c = item.Id,
				Amount__c = 3,
				UnitCost__c = 5.00
		);

		Test.startTest();
		// INSERT
		insert pl;
		p = [SELECT Id, TotalItems__c, GrandTotal__c FROM Purchase__c WHERE Id = :p.Id];
		System.assertEquals(3, Integer.valueOf(p.TotalItems__c), 'После insert должно быть 3 товара');
		System.assertEquals(15.00, p.GrandTotal__c, 'После insert сумма должна быть 15.00');

		// UPDATE
		pl.Amount__c = 5;
		update pl;
		p = [SELECT Id, TotalItems__c, GrandTotal__c FROM Purchase__c WHERE Id = :p.Id];
		System.assertEquals(5, Integer.valueOf(p.TotalItems__c), 'После update должно быть 5 товаров');
		System.assertEquals(25.00, p.GrandTotal__c, 'После update сумма должна быть 25.00');

		// DELETE
		delete pl;
		p = [SELECT Id, TotalItems__c, GrandTotal__c FROM Purchase__c WHERE Id = :p.Id];
		System.assertEquals(0, Integer.valueOf(p.TotalItems__c), 'После delete должно быть 0 товаров');
		System.assertEquals(0, p.GrandTotal__c, 'После delete сумма должна быть 0');
		Test.stopTest();
	}
}
