import { LightningElement, track } from 'lwc';
import fetchImageByQuery from '@salesforce/apex/UnsplashService.fetchImageByQuery';
import { createRecord } from 'lightning/uiRecordApi';
import ITEM_OBJECT from '@salesforce/schema/Item__c';
import NAME_FIELD from '@salesforce/schema/Item__c.Name';
import PRICE_FIELD from '@salesforce/schema/Item__c.Price__c';
import IMAGE_FIELD from '@salesforce/schema/Item__c.Image__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateItemWithPhoto extends LightningElement {
    @track name = '';
    @track price = null;
    @track isSaving = false;

    onNameChange(e) { this.name = e.target.value; }
    onPriceChange(e) { this.price = parseFloat(e.target.value); }

    handleCreate() {
        if (!this.name) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: 'Name required', variant: 'error' }));
            return;
        }
        this.isSaving = true;
        // 1) get unsplash image url via Apex
        fetchImageByQuery({ query: this.name })
            .then(url => {
                const fields = {};
                fields[NAME_FIELD.fieldApiName] = this.name;
                if (this.price != null) fields[PRICE_FIELD.fieldApiName] = this.price;
                if (url) fields[IMAGE_FIELD.fieldApiName] = url;

                const recordInput = { apiName: ITEM_OBJECT.objectApiName, fields };
                return createRecord(recordInput);
            })
            .then(res => {
                this.isSaving = false;
                this.name = '';
                this.price = null;
                this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Item created', variant: 'success' }));
            })
            .catch(err => {
                this.isSaving = false;
                console.error(err);
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: err.body ? err.body.message : err.message, variant: 'error' }));
            });
    }
}
