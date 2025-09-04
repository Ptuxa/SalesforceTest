import { LightningElement, track, api, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getItems from '@salesforce/apex/ItemController.getItems';
import getAccountInfo from '@salesforce/apex/ItemController.getAccountInfo';
import createPurchaseWithLines from '@salesforce/apex/PurchaseService.createPurchaseWithLines';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

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

    @api recordId; // автоматически передается LWC

    // -------------------------------
    // Подключаем CurrentPageReference для SPA-переходов
    // -------------------------------
    @wire(CurrentPageReference)
    wiredPageRef(pageRef) {
        const recId = pageRef?.state?.c__recordId;
        if (recId && recId !== this.accountId) {
            this.accountId = recId;
            this.loadAccountInfo(recId);
        }
    }

    connectedCallback() {
        if (this.recordId) {
            this.accountId = this.recordId;
            this.loadAccountInfo(this.recordId);
        }
    }

    // -------------------------------
    // Геттер для кнопки Create Item
    // -------------------------------
    get createDisabled() {
        return !this.isManager;
    }

    // -------------------------------
    // Загрузка информации об аккаунте
    // -------------------------------
    loadAccountInfo(accountId) {
        this.isLoading = true;
        getAccountInfo({ accountId })
            .then(res => {
                this.account = res.account;
                this.isManager = res.isManager;
                this.loadItems(); // после загрузки аккаунта грузим items
            })
            .catch(err => this.showError(err))
            .finally(() => this.isLoading = false);
    }

    // -------------------------------
    // Загрузка элементов
    // -------------------------------
    loadItems() {
        if (!this.accountId) return;
        this.isLoading = true;
        getItems({ accountId: this.accountId })
            .then(data => {
                this.items = data;
                this.filteredItems = data;
                this.types = [...new Set(data.map(i => i.Type__c).filter(Boolean))];
                this.families = [...new Set(data.map(i => i.Family__c).filter(Boolean))];
            })
            .catch(err => this.showError(err))
            .finally(() => this.isLoading = false);
    }

    // -------------------------------
    // Фильтры и поиск
    // -------------------------------
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
            const matchesSearch =
                !this.searchKey ||
                (i.Name && i.Name.toLowerCase().includes(this.searchKey)) ||
                (i.Description__c && i.Description__c.toLowerCase().includes(this.searchKey));
            const matchesType = checkedTypes.length ? checkedTypes.includes(i.Type__c) : true;
            const matchesFamily = checkedFamilies.length ? checkedFamilies.includes(i.Family__c) : true;
            return matchesSearch && matchesType && matchesFamily;
        });
    }

    // -------------------------------
    // Корзина
    // -------------------------------
    handleAddToCart(e) {
        const item = e.detail;
        if (!this.cart.some(c => c.Id === item.Id)) {
            this.cart = [...this.cart, { ...item, qty: 1 }];
            this.showToast('Added', `${item.Name} added to cart`, 'success');
        }
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
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: purchaseId,
                        objectApiName: 'Purchase__c',
                        actionName: 'view'
                    }
                });
            })
            .catch(err => this.showError(err))
            .finally(() => this.isLoading = false);
    }

    // -------------------------------
    // Детали товара
    // -------------------------------
    showDetails(e) {
        this.selectedItemId = e.detail;
    }

    closeDetails() {
        this.selectedItemId = null;
    }

    // -------------------------------
    // Создание нового Item
    // -------------------------------
    handleCreateItem() {
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
        this.showToast('Success', 'Item created', 'success');
        this.loadItems(); // обновляем список после создания
    }

    // -------------------------------
    // Toast / ошибки
    // -------------------------------
    showToast(title, message, variant='info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(err) {
        const msg = (err && err.body && err.body.message) ? err.body.message : JSON.stringify(err);
        this.showToast('Error', msg, 'error');
    }

    get cartLabel() {
        return `Cart (${this.cart.length})`;
    }
}
