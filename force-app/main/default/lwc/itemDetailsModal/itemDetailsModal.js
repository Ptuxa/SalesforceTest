import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import NAME_FIELD from '@salesforce/schema/Item__c.Name';
import DESC_FIELD from '@salesforce/schema/Item__c.Description__c';
import PRICE_FIELD from '@salesforce/schema/Item__c.Price__c';
import IMAGE_FIELD from '@salesforce/schema/Item__c.Image__c';

// Apex метод для запроса Unsplash
import fetchImageByQuery from '@salesforce/apex/UnsplashService.fetchImageByQuery';

export default class ItemDetailsModal extends LightningElement {
    @api itemId;
    @track fallbackImageUrl;

    @wire(getRecord, { recordId: '$itemId', fields: [NAME_FIELD, DESC_FIELD, PRICE_FIELD, IMAGE_FIELD] })
    item;

    handleClose() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    get name() { return this.item.data?.fields?.Name?.value; }
    get description() { return this.item.data?.fields?.Description__c?.value; }
    get price() { return this.item.data?.fields?.Price__c?.value; }

    // Картинка: сперва из поля, если пусто — грузим из Unsplash
    get imageUrl() {
        const sfImage = this.item.data?.fields?.Image__c?.value;
        if (sfImage) {
            return sfImage;
        }
        return this.fallbackImageUrl; // если есть — берём от Unsplash
    }

    // Когда данные подгрузились — дёргаем Apex для fallback
    renderedCallback() {
        if (!this.imageUrl && this.name && !this.fallbackImageUrl) {
            fetchImageByQuery({ query: this.name })
                .then(url => {
                    this.fallbackImageUrl = url;
                })
                .catch(err => {
                    console.error('Unsplash fetch error', err);
                });
        }
    }
}
