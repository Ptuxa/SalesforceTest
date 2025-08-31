import { LightningElement, api } from 'lwc';
export default class ItemDetailsModal extends LightningElement {
    @api itemId;

    handleClose() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }
}
