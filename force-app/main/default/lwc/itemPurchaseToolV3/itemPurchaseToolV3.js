import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getItems from '@salesforce/apex/ItemController.getItems';
import getAccountInfo from '@salesforce/apex/ItemController.getAccountInfo';
import createPurchaseWithLines from '@salesforce/apex/PurchaseService.createPurchaseWithLines';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
// import { getRecord } from 'lightning/uiRecordApi';
import NAME_FIELD from '@salesforce/schema/Item__c.Name';
import PRICE_FIELD from '@salesforce/schema/Item__c.Price__c';
import TYPE_FIELD from '@salesforce/schema/Item__c.Type__c';
import FAMILY_FIELD from '@salesforce/schema/Item__c.Family__c';
import IMAGE_FIELD from '@salesforce/schema/Item__c.Image__c';
import { getRecord } from 'lightning/uiRecordApi';

export default class ItemPurchaseToolV3 extends NavigationMixin(LightningElement) {
    @track items = [];
    @track filteredItems = [];
    @track cart = [];
    @track types = [];
    @track families = [];
    @track account = {};
    @track selectedItemId = null;

    @track isCartOpen = false;
    @track isLoading = false;
    @track isManager = false;

    searchKey = '';
    accountId = null;

    @wire(CurrentPageReference)
    pageRef;

    get recordIdFromUrl() {
        return this.pageRef?.state?.c__recordId || null;
    }

    get createDisabled() {
        return !this.isManager;
    }

    connectedCallback() {
        const recId = this.recordIdFromUrl;
        console.log('recordIdFromUrl:', recId);
        if (recId) {
            this.accountId = recId;
            this.loadAccountInfo(recId);
            this.loadItems();
        } else {
            console.warn('recordId не передан в URL');
        }
    }

    loadAccountInfo(accountId) {
        this.isLoading = true;
        getAccountInfo({ accountId })
            .then(res => {
                console.log('getAccountInfo response:', res);
                this.account = res.account;
                this.isManager = res.isManager;
            })
            .catch(err => {
                console.error('getAccountInfo error:', err);
                this.showError(err);
            })
            .finally(() => this.isLoading = false);
    }

    loadItems() {
        this.isLoading = true;
        getItems()
            .then(data => {
                console.log('getItems response:', data);
                this.items = data;
                this.filteredItems = data;
                this.types = [...new Set(data.map(i => i.Type__c).filter(Boolean))];
                this.families = [...new Set(data.map(i => i.Family__c).filter(Boolean))];
            })
            .catch(err => {
                console.error('getItems error:', err);
                this.showError(err);
            })
            .finally(() => this.isLoading = false);
    }

    onSearch(e) {
        this.searchKey = e.target.value.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        const checkedTypes = Array.from(this.template.querySelectorAll('.type-checkbox'))
            .filter(ch => ch.checked)
            .map(ch => ch.dataset.value);
        const checkedFamilies = Array.from(this.template.querySelectorAll('.family-checkbox'))
            .filter(ch => ch.checked)
            .map(ch => ch.dataset.value);

        this.filteredItems = this.items.filter(i => {
            const matchesSearch = !this.searchKey || (i.Name && i.Name.toLowerCase().includes(this.searchKey)) || (i.Description__c && i.Description__c.toLowerCase().includes(this.searchKey));
            const matchesType = checkedTypes.length ? checkedTypes.includes(i.Type__c) : true;
            const matchesFamily = checkedFamilies.length ? checkedFamilies.includes(i.Family__c) : true;
            return matchesSearch && matchesType && matchesFamily;
        });
    }

    handleAddToCart(e) {
        const item = e.detail;
        if (!this.cart.some(c => c.Id === item.Id)) {
            this.cart = [...this.cart, { ...item, qty: 1 }];
            this.showToast('Added', `${item.Name} added to cart`, 'success');
        }
    }

    showDetails(e) {
        this.selectedItemId = e.detail;
    }

    closeDetails() {
        this.selectedItemId = null;
    }

    openCart() { this.isCartOpen = true; }
    closeCart() { this.isCartOpen = false; }

    handleCheckout() {
        if (!this.cart.length) {
            this.showToast('Error', 'Cart is empty', 'error');
            return;
        }

        const lines = this.cart.map(c => ({ itemId: c.Id, amount: c.qty, unitCost: c.Price__c }));
        this.isLoading = true;

        createPurchaseWithLines({ accountId: this.accountId, lines })
            .then(purchaseId => {
                this.showToast('Success', 'Purchase created', 'success');
                // SPA navigation без перезагрузки
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: purchaseId,
                        objectApiName: 'Purchase__c',
                        actionName: 'view'
                    }
                });
            })
            .catch(err => {
                console.error('createPurchaseWithLines error:', err);
                this.showError(err);
            })
            .finally(() => this.isLoading = false);
    }

    handleCreateItem() {
        console.log('handleCreateItem clicked');
        const modal = this.template.querySelector('c-create-item-with-photo');
        if (modal && typeof modal.open === 'function') {
            modal.open();
        } else {
            console.error('Create modal component not found or has no open()');
        }
    }


    handleItemCreated(e) {
        const newId = e.detail?.id;
        if (!newId) return;

        const newItem = {
            Id: newId,
            Name: this.name,
            Price__c: this.price,
            Type__c: this.type,
            Family__c: this.family,
            Image__c: this.imageUrl
        };

        this.items = [...this.items, newItem];
        this.filteredItems = [...this.filteredItems, newItem];

        this.showToast('Success', 'Item created', 'success');
    }


    handleCreateModalClose() {
        // любой пост-обработчик при закрытии
    }

    showToast(title, message, variant='info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(err) {
        const msg = (err && err.body && err.body.message) ? err.body.message : JSON.stringify(err);
        this.showToast('Error', msg, 'error');
    }
}
