import { LightningElement, track, api } from 'lwc';
import getItems from '@salesforce/apex/ItemController.getItems';
import getAccountInfo from '@salesforce/apex/ItemController.getAccountInfo';
import createPurchaseWithLines from '@salesforce/apex/PurchaseService.createPurchaseWithLines';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ItemPurchaseToolV3 extends LightningElement {
    @track items = [];
    @track filteredItems = [];
    @track cart = [];
    @track types = [];
    @track families = [];
    @track account = {};
    @track selectedItemId = null;
    @api recordId;

    searchKey = '';
    accountId = null;
    isManager = false;

    // computed property for disabled attribute (no `!` in template)
    get createDisabled() {
        console.log('isManager response:', JSON.stringify(this.isManager));

        return !this.isManager;
    }

    connectedCallback() {
        // const params = new URLSearchParams(window.location.search);
        // const recId = params.get('c__recordId');

        console.log('recordId response:', JSON.stringify(this.recordId));

        if (this.recordId) {
            this.accountId = this.recordId;
            getAccountInfo({ accountId: this.recordId })
                .then(res => {
                    this.account = res.account;
                    this.isManager = res.isManager;
                })
                .catch(err => this.showError(err));
            this.loadItems();
        }
    }

    loadItems() {
        getItems()
            .then(data => {
                this.items = data;
                this.filteredItems = data;
                this.types = [...new Set(data.map(i => i.Type__c).filter(Boolean))];
                this.families = [...new Set(data.map(i => i.Family__c).filter(Boolean))];
            })
            .catch(err => this.showError(err));
    }

    onSearch(e) {
        this.searchKey = e.target.value.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        const checkedTypes = Array.from(this.template.querySelectorAll('.type-checkbox')).filter(ch => ch.checked).map(ch => ch.dataset.value);
        const checkedFamilies = Array.from(this.template.querySelectorAll('.family-checkbox')).filter(ch => ch.checked).map(ch => ch.dataset.value);

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

    openCart() {
        const modal = this.template.querySelector('c-cart-modal');
        if (modal && modal.open) modal.open();
    }

    closeCart() {
        const modal = this.template.querySelector('c-cart-modal');
        if (modal && modal.close) modal.close();
    }

    handleCheckout() {
        if (!this.cart.length) { this.showToast('Error', 'Cart is empty', 'error'); return; }
        const lines = this.cart.map(c => ({ itemId: c.Id, amount: c.qty, unitCost: c.Price__c }));
        createPurchaseWithLines({ accountId: this.accountId, lines })
            .then(purchaseId => {
                this.showToast('Success', 'Purchase created', 'success');
                window.location.href = `/lightning/r/Purchase__c/${purchaseId}/view`;
            })
            .catch(err => this.showError(err));
    }

    handleCreateItem() {
        // open modal / navigate to create component — not inline-coded
        // you can dispatch an event or show a modal component
        this.showToast('Info', 'Create item clicked', 'info');
    }

    showToast(title, message, variant='info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(err) {
        const msg = (err && err.body && err.body.message) ? err.body.message : JSON.stringify(err);
        this.showToast('Error', msg, 'error');
    }
}
