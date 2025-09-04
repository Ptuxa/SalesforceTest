public class PurchaseLineInput {
	@AuraEnabled public Id itemId;
	@AuraEnabled public Decimal amount;
	@AuraEnabled public Decimal unitCost;
}