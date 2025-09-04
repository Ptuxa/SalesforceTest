import { LightningElement, api } from 'lwc';

export default class CartModal extends LightningElement {
    @api cart = [];
    @api accountId;

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Qty', fieldName: 'qty', type: 'number' },
        { label: 'Price', fieldName: 'Price__c', type: 'currency' },
        { label: 'Total', type: 'currency',
            cellAttributes: { alignment: 'left' },
            typeAttributes: { currencyCode: 'USD' },
            fieldName: 'total' }
    ];

    connectedCallback() {
        // добавляем поле "total" для удобства
        this.cart = this.cart.map(i => ({
            ...i,
            total: i.Price__c * i.qty
        }));
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleCheckout() {
        this.dispatchEvent(new CustomEvent('checkout'));
    }

    // вычисляем общую сумму
    get grandTotal() {
        return this.cart.reduce((sum, i) => sum + (i.Price__c * i.qty), 0);
    }

    // общее количество
    get totalItems() {
        return this.cart.reduce((sum, i) => sum + i.qty, 0);
    }

    get isCheckoutDisabled() {
        return this.cart.length === 0;
    }
}