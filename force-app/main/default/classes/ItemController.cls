public with sharing class ItemController {
  @AuraEnabled(cacheable=false)
  public static List<Item__c> getItems(Id accountId) {
    return [
            SELECT Id, Name, Price__c, Type__c, Family__c, Image__c, Account__c
            FROM Item__c
            WHERE Account__c = :accountId
    ];
  }

  @AuraEnabled(cacheable=false)
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
