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
    @track showDetailsModal = false;

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

        // Ищем товар в корзине
        const existing = this.cart.find(c => c.Id === item.Id);

        if (existing) {
            // Если уже есть — увеличиваем qty
            existing.qty += 1;
            this.cart = [...this.cart]; // пересоздаём массив, чтобы LWC увидел изменения
            this.showToast('Updated', `${item.Name} quantity: ${existing.qty}`, 'info');
        } else {
            // Если товара ещё нет — добавляем с qty = 1
            this.cart = [...this.cart, { ...item, qty: 1 }];
            this.showToast('Added', `${item.Name} added to cart`, 'success');
        }
    }


    openCart() { this.isCartOpen = true; }
    closeCart() { this.isCartOpen = false; }

    async handleCartCheckout() {
        console.log('accountId:', this.accountId);
        console.log('cart raw:', JSON.stringify(this.cart, null, 2));
        console.log('Checkout linesInput:', JSON.stringify(linesInput, null, 2));

        console.log('Checkout clicked');

        if (!this.accountId) {
            this.showToast('Error', 'AccountId not set', 'error');
            return;
        }
        else {
            console.log('ok');
        }

        console.log('accountId:', this.accountId);

        if (!this.cart.length) {
            this.showToast('Error', 'Cart is empty', 'error');
            return;
        }

        for (const c of this.cart) {
            if (!c.Id || !c.Price__c) {
                this.showToast('Error', `Item ${c.Name} has missing fields`, 'error');
                return;
            }
        }

        const linesInput = this.cart.map(c => ({
            itemId: c.Id,
            amount: Number(c.qty),
            unitCost: Number(c.Price__c) || 0
        }));

        console.log('Checkout lines:', JSON.stringify(linesInput));

        this.isLoading = true;
        try {
            const purchaseId = await createPurchaseWithLines({
                accountId: this.accountId,
                lines: JSON.parse(JSON.stringify(linesInput))
            });
            console.log('Purchase created, id:', purchaseId);
            this.showToast('Success', 'Purchase created', 'success');
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: purchaseId, objectApiName: 'Purchase__c', actionName: 'view' }
            });
        } catch (err) {
            console.error('Checkout error (raw):', err);
            let msg = 'Unknown server error';
            try {
                if (err && err.body) {
                    if (err.body.pageErrors && err.body.pageErrors.length) {
                        msg = err.body.pageErrors.map(pe => pe.message).join('; ');
                    } else if (err.body.message) {
                        msg = err.body.message;
                    } else {
                        // fieldErrors -> compose message
                        const fe = err.body.fieldErrors || {};
                        const parts = [];
                        for (const f of Object.keys(fe)) {
                            fe[f].forEach(feItem => parts.push(`${f}: ${feItem.message}`));
                        }
                        if (parts.length) msg = parts.join('; ');
                        else msg = JSON.stringify(err.body);
                    }
                } else if (err && err.message) {
                    msg = err.message;
                } else {
                    msg = String(err);
                }
            } catch (parseErr) {
                console.error('Error parsing server error:', parseErr);
                msg = 'Error parsing server response';
            }
            this.showToast('Error', `Checkout failed: ${msg}`, 'error');
            console.error('Checkout error (message):', msg);
        } finally {
            this.isLoading = false;
        }

    }

    handleCartClose() {
        this.isCartOpen = false; // переменная, управляющая отображением модального
    }


    // -------------------------------
    // Детали товара
    // -------------------------------
    handleShowDetails(e) {
        this.selectedItemId = e.detail;
        this.showDetailsModal = true;
    }

    handleCloseDetails() {
        this.showDetailsModal = false;
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
