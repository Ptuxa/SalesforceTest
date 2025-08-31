import { LightningElement, api, track } from 'lwc';
export default class CartModal extends LightningElement {
    @api cart = [];
    show() { this.template.host.style.display = 'block'; }
    hide() { this.template.host.style.display = 'none'; }
    checkout() { this.dispatchEvent(new CustomEvent('checkout')); }
}