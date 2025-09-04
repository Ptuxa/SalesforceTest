public with sharing class PurchaseLineHandler {
  /**
   * Recalculate totals on Purchase__c when PurchaseLine__c changes.
   * isDelete: true when trigger is delete (after delete), false otherwise
   */
  public static void recalc(Map<Id, PurchaseLine__c> oldMap, Map<Id, PurchaseLine__c> newMap, Boolean isDelete) {
    Set<Id> purchaseIds = new Set<Id>();

    if (isDelete) {
      if (oldMap != null) {
        for (PurchaseLine__c pl : oldMap.values()) {
          if (pl.PurchaseId__c != null) purchaseIds.add(pl.PurchaseId__c);
        }
      }
    } else {
      if (newMap != null) {
        for (PurchaseLine__c pl : newMap.values()) {
          if (pl.PurchaseId__c != null) purchaseIds.add(pl.PurchaseId__c);
        }
      }
      if (oldMap != null) {
        for (PurchaseLine__c pl : oldMap.values()) {
          if (pl.PurchaseId__c != null) purchaseIds.add(pl.PurchaseId__c);
        }
      }
    }

    if (purchaseIds.isEmpty()) return;

    List<AggregateResult> ag = [
            SELECT PurchaseId__c pid, SUM(Amount__c) totalItems, SUM(LineTotal__c) grandTotal
            FROM PurchaseLine__c
            WHERE PurchaseId__c IN :purchaseIds
            GROUP BY PurchaseId__c
    ];

    Map<Id, Decimal> mapItems = new Map<Id, Decimal>();
    Map<Id, Decimal> mapTotals = new Map<Id, Decimal>();
    for (AggregateResult ar : ag) {
      Id pid = (Id) ar.get('pid');
      mapItems.put(pid, (Decimal) ar.get('totalItems'));
      mapTotals.put(pid, (Decimal) ar.get('grandTotal'));
    }

    List<Purchase__c> updates = new List<Purchase__c>();
    for (Id pid : purchaseIds) {
      Purchase__c p = new Purchase__c(Id = pid);
      p.TotalItems__c = mapItems.containsKey(pid) ? mapItems.get(pid) : 0;
      p.GrandTotal__c = mapTotals.containsKey(pid) ? mapTotals.get(pid) : 0;
      updates.add(p);
    }

    System.debug(JSON.serialize(updates));

    if (!updates.isEmpty()) update updates;
  }
}
