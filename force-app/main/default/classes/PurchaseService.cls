public with sharing class PurchaseService {
  @AuraEnabled
  public static Id createPurchaseWithLines(Id accountId, List<PurchaseLineInput> lines) {
    if (accountId == null || lines == null || lines.isEmpty()) {
      throw new AuraHandledException('Invalid input');
    }

    Purchase__c p = new Purchase__c(ClientId__c = accountId);
    insert p;

    List<PurchaseLine__c> pls = new List<PurchaseLine__c>();
    for (PurchaseLineInput li : lines) {
      pls.add(new PurchaseLine__c(
              PurchaseId__c = p.Id,
              ItemId__c = li.itemId,
              Amount__c = li.amount,
              UnitCost__c = li.unitCost
      ));
    }
    insert pls;
    return p.Id;
  }

  public class PurchaseLineInput {
    @AuraEnabled public Id itemId;
    @AuraEnabled public Decimal amount;
    @AuraEnabled public Decimal unitCost;
  }
}
