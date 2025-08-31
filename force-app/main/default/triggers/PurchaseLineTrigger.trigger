trigger PurchaseLineTrigger on PurchaseLine__c (
		after insert, after update, after delete, after undelete
) {
	// Передаём в handler все нужные данные и флаг удаления
	PurchaseLineHandler.recalc(Trigger.oldMap, Trigger.newMap, Trigger.isDelete);
}
