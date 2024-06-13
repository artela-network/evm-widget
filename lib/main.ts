import './main.css';
import { createApp, h } from 'vue';
// @ts-ignore
import wrapper from 'vue3-webcomponent-wrapper';

import TxDialog from './components/TxDialog/index.vue';
import ConnectWallet from './components/ConnectWallet/index.vue';
import TokenConvert from './components/TokenConvert/index.vue';

function registry(name: string, module: any) {
    if (!window.customElements.get(name)) {
        const component = wrapper(module, createApp, h);
        window.customElements.define(name, component);
    }
}

registry('ping-tx-dialog', TxDialog)
registry('ping-connect-wallet', ConnectWallet)
registry('ping-token-convert', TokenConvert)

export default {
    version: '0.0.5',
};
