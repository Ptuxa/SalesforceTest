public with sharing class ItemController {
  @AuraEnabled(cacheable=true)
  public static List<Item__c> getItems() {
    return [
            SELECT Id, Name, Description__c, Type__c, Family__c, Image__c, Price__c
            FROM Item__c
            WHERE Price__c != null
            ORDER BY Name
            LIMIT 1000
    ];
  }

  @AuraEnabled(cacheable=true)
  public static AccountDTO getAccountInfo(Id accountId) {
    Account acc = [SELECT Id, Name, AccountNumber, Industry FROM Account WHERE Id = :accountId LIMIT 1];
    User u = [SELECT Id, IsManager__c FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
    AccountDTO dto = new AccountDTO();
    dto.account = acc;
    dto.isManager = u.IsManager__c;
    return dto;
  }

  public class AccountDTO {
    @AuraEnabled public Account account;
    @AuraEnabled public Boolean isManager;
  }
}
