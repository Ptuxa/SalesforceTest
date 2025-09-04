import { LightningElement, track, api } from 'lwc';
import fetchImageByQuery from '@salesforce/apex/UnsplashService.fetchImageByQuery';
import { createRecord } from 'lightning/uiRecordApi';
import ITEM_OBJECT from '@salesforce/schema/Item__c';
import NAME_FIELD from '@salesforce/schema/Item__c.Name';
import DESCRIPTION_FIELD from '@salesforce/schema/Item__c.Description__c';
import TYPE_FIELD from '@salesforce/schema/Item__c.Type__c';
import FAMILY_FIELD from '@salesforce/schema/Item__c.Family__c';
import PRICE_FIELD from '@salesforce/schema/Item__c.Price__c';
import IMAGE_FIELD from '@salesforce/schema/Item__c.Image__c';
import ACCOUNT_FIELD from '@salesforce/schema/Item__c.Account__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateItemWithPhoto extends LightningElement {
    @track visible = false;
    @track isSaving = false;

    @api accountId;
    @track name = '';
    @track description = '';
    @track type = '';
    @track family = '';
    @track price = null;

    typeOptions = [
        { label: 'Type A', value: 'Type A' },
        { label: 'Type B', value: 'Type B' },
    ];

    familyOptions = [
        { label: 'Family X', value: 'Family X' },
        { label: 'Family Y', value: 'Family Y' },
    ];

    @api open() { this.visible = true; }
    @api close() { this.visible = false; }

    onNameChange(e) { this.name = e.target.value; }
    onDescriptionChange(e) { this.description = e.target.value; }
    onTypeChange(e) { this.type = e.detail.value; }
    onFamilyChange(e) { this.family = e.detail.value; }
    onPriceChange(e) {
        const val = e.target.value;
        this.price = val === '' ? null : Number(val);
    }

    handleCancel() {
        this.visible = false;
    }

    async handleCreate() {
        if (!this.name) {
            this.showToast('Error', 'Name required', 'error');
            return;
        }
        if (this.price === null || Number.isNaN(this.price)) {
            this.showToast('Error', 'Price required', 'error');
            return;
        }

        this.isSaving = true;

        try {
            const imageUrl = await fetchImageByQuery({ query: this.name });

            const fields = {
                [NAME_FIELD.fieldApiName]: this.name,
                [DESCRIPTION_FIELD.fieldApiName]: this.description,
                [TYPE_FIELD.fieldApiName]: this.type,
                [FAMILY_FIELD.fieldApiName]: this.family,
                [PRICE_FIELD.fieldApiName]: this.price
            };
            if (imageUrl) fields[IMAGE_FIELD.fieldApiName] = imageUrl;
            if (this.accountId) fields[ACCOUNT_FIELD.fieldApiName] = this.accountId;

            const rec = await createRecord({ apiName: ITEM_OBJECT.objectApiName, fields });

            this.showToast('Success', 'Item created', 'success');

            // уведомляем родительский компонент
            this.dispatchEvent(new CustomEvent('created', {
                detail: { id: rec.id, accountId: this.accountId }
            }));

            // очистка формы
            this.name = '';
            this.description = '';
            this.type = '';
            this.family = '';
            this.price = null;
            this.visible = false;

        } catch (err) {
            this.showToast('Error', err.body ? err.body.message : err.message, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    showToast(title, message, variant='info') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
