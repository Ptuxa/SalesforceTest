public with sharing class PurchaseService {
  @AuraEnabled
  public static Id createPurchaseWithLines(Id accountId, List<Map<String, Object>> lines) {
    System.debug('createPurchaseWithLines called. accountId=' + accountId + ', raw lines=' + JSON.serialize(lines));

    if (accountId == null) {
      throw new AuraHandledException('Invalid input: accountId is null');
    }
    if (lines == null || lines.isEmpty()) {
      throw new AuraHandledException('Invalid input: lines is null or empty');
    }

    Purchase__c p = new Purchase__c(ClientId__c = accountId);
    try {
      insert p;
    } catch (DmlException ex) {
      System.debug('Insert purchase failed: ' + ex.getMessage());
      throw new AuraHandledException('Failed to create Purchase: ' + ex.getMessage());
    }

    List<PurchaseLine__c> pls = new List<PurchaseLine__c>();
    Integer idx = 0;
    for (Map<String, Object> li : lines) {
      idx++;
      String itemIdStr = (li.get('itemId') == null) ? null : String.valueOf(li.get('itemId'));
      if (String.isBlank(itemIdStr)) {
        throw new AuraHandledException('Missing itemId for line #' + idx);
      }

      Decimal amountDec;
      Decimal unitCostDec;
      try {
        amountDec = (li.get('amount') == null) ? 0 : Decimal.valueOf(String.valueOf(li.get('amount')));
      } catch (Exception ex) {
        throw new AuraHandledException('Invalid amount for line #' + idx + ': ' + ex.getMessage());
      }

      try {
        unitCostDec = (li.get('unitCost') == null) ? 0 : Decimal.valueOf(String.valueOf(li.get('unitCost')));
      } catch (Exception ex) {
        throw new AuraHandledException('Invalid unitCost for line #' + idx + ': ' + ex.getMessage());
      }

      // Проверка существования Item (даёт понятную ошибку, если Id неверный)
      Item__c it;
      try {
        it = [SELECT Id FROM Item__c WHERE Id = :itemIdStr LIMIT 1];
      } catch (Exception ex) {
        throw new AuraHandledException('Item not found or invalid Id for line #' + idx + ': ' + itemIdStr);
      }

      pls.add(new PurchaseLine__c(
              PurchaseId__c = p.Id,
              ItemId__c     = it.Id,
              Amount__c     = amountDec,
              UnitCost__c   = unitCostDec
      ));
    }

    try {
      insert pls;
    } catch (DmlException dex) {
      System.debug('Insert PurchaseLines failed: ' + dex.getMessage());
      // по желанию можно удалить p, если вставка строк упала
      throw new AuraHandledException('Failed to create Purchase lines: ' + dex.getMessage());
    }

    return p.Id;
  }
}
