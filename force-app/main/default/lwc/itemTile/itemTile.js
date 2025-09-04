import { LightningElement, api } from 'lwc';
export default class ItemTile extends LightningElement {
    @api item;

    add() {
        this.dispatchEvent(new CustomEvent('addtocart', { detail: this.item }));
    }
    handleDetailsClick() {
        this.dispatchEvent(new CustomEvent('showdetails', {
            detail: this.item.Id
        }));
    }
}
