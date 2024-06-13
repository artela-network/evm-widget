<script setup lang="ts">
import { onMounted, ref } from 'vue';
import pingWidget from '../lib/main';
import { ethToEthermint, ethermintToEth } from '../lib/utils/format';

// const sender = 'evmos13zl7c4ea60jt05hxhl2dp443r7zrlz4plc5m8z';
// const endpoint = 'https://api-cosmoshub-ia.cosmosia.notional.ventures'// 'https://rest.stargaze-apis.com';
// const endpoint = 'https://api.uni.junonetwork.io'

interface Config {
    sender: string,
    endpoint: string;
    chainId: string;
    hdPath: string;
    chainName: string
    params: string
}

// @ts-ignore
const EVMOS: Config = {
    sender: 'evmos1ayp22xk4nwc9lhjh6tvdat2j2klnvvk29yx87m',
    endpoint: 'https://rest.bd.evmos.org:1317',
    chainId: 'evmos_9001-2',
    hdPath: "m/44'/60/0'/0/0",
    chainName: 'evmos',
    params: JSON.stringify({
        proposal_id: '1',
        validator_address: "evmosvaloper1tdss4m3x7jy9mlepm2dwy8820l7uv6m2vx6z88",
        chain_name: 'evmos',
        contract: 'add',
        fees: {amount: '6000000000000000', denom: ''}
    })
}

// @ts-ignore
const JUNO: Config = {
    sender: 'juno1m8mma95ta2zajqtmfp5c5y3wgeyqzcrcgcnv4a',
    endpoint: 'https://juno-api.polkachu.com',
    chainId: 'juno-1',
    hdPath: "m/44'/118/0'/0/0",
    chainName: 'juno',
    params: JSON.stringify({
        proposal_id: '1',
        validator_address: "junovaloper1jxv0u20scum4trha72c7ltfgfqef6nscm9pmg2",
        chain_name: 'juno',
        contract: 'junovaloper1jxv0u20scum4trha72c7ltfgfqef6nscm9pmg2',
        fees: {amount: '2000', denom: ''}
    })
}

// @ts-ignore
const NEUTRON: Config = {
    sender: 'neutron1m8mma95ta2zajqtmfp5c5y3wgeyqzcrc64e4gx',
    endpoint: 'https://neutron-api.polkachu.com',
    chainId: 'neutron-1',
    hdPath: "m/44'/118/0'/0/0",
    chainName: 'neutron',
    params: JSON.stringify({
        chain_name: 'neutron',
        contract: 'neutron198sxsrjvt2v2lln2ajn82ks76k97mj72mtgl7309jehd0vy8rezs7e6c56',
        fees: {amount: '2000', denom: ''}
    })
}

// @ts-ignore
const Archway: Config = {
    sender: 'archway1jtdje5vq42sknl22r4wu9sahryu5wcrd3yd7z8',
    endpoint: 'https://api.constantine.archway.tech',
    chainId: 'constantine-3',
    hdPath: "m/44'/118/0'/0/0",
    chainName: 'archway',
    params: JSON.stringify({
        chain_name: 'archway',
        contract: 'archway1tc7k4683zqn8krm3vq7ed5jd4l23c2h9kyswc75zpc8aeln6smqsz79j44',
        fees: {amount: '2000', denom: ''}
    })
}

// @ts-ignore
const btc: Config = {
    sender: 'bc1qjdyxk9t90jxmeqpdwkn8cd7nj6cu7x3m688xlj',
    endpoint: 'https://devnet-2-rest.side.one',
    chainId: 'taproot-1', // side-testnet-1
    hdPath: "m/44'/118/0'/0/0",
    chainName: 'side-devnet-2',
    params: JSON.stringify({
        // proposal_id: '1',
        // validator_address: "evmosvaloper1tdss4m3x7jy9mlepm2dwy8820l7uv6m2vx6z88",
        // chain_name: 'evmos',
        // contract: 'add',
        // fees: {amount: '6000000000000000', denom: ''}
    })
}


const conf = ref(JUNO)

const types = [
    'send',
    'delegate',
    'vote',
    'redelegate',
    'unbond',
    'transfer',
    'deposit',
    'withdraw',
    'withdraw_commission',
    'wasm_instantiate_contract',
    'wasm_execute_contract',
    'wasm_store_code',
    'wasm_migrate_contract',
    'wasm_update_admin',
    'wasm_clear_admin',
];
const toOpen = ref('send');

const theme = ref('light');
const switchTheme = () => {
    if (theme.value === 'light') {
        theme.value = 'dark';
        document.documentElement.classList.add('dark');
    } else {
        theme.value = 'light';
        document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme.value);
};

onMounted(() => {
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
});
const walletStateChange = (res: any) => {
   console.log(res, 'resres');
};

console.log("0x88BFec573Dd3E4b7d2E6BfD4D0D6B11F843F8aa1")
console.log(ethToEthermint("0x88BFec573Dd3E4b7d2E6BfD4D0D6B11F843F8aa1", "evmos"))
console.log(ethermintToEth("evmos13zl7c4ea60jt05hxhl2dp443r7zrlz4plc5m8z"))

</script>

<template>
    <div class="bg-gray-50 dark:bg-base-100 dark:text-white min-h-[100vh]">
        Ping Widget Version: {{ pingWidget?.version }}

        <div class="btn btn-sm normal-case" @click="switchTheme()">
            Theme: {{ theme }}
        </div>

        <div>&nbsp;</div>
        <ping-connect-wallet
            :chain-id="conf.chainId"
            :hd-path="conf.hdPath"
            @change="walletStateChange"
        />

        <textarea v-model="conf.params" cols="80" rows="5"></textarea>
        <div></div>

        <select v-model="toOpen">
            <option v-for="i in types">{{ i }}</option>
        </select>

        <br />

        <label :for="toOpen" class="btn">{{ toOpen }}</label>
        <ping-tx-dialog
            :type="toOpen"
            :sender="conf.sender"
            :registry-name="conf.chainName"
            :endpoint="conf.endpoint"
            :hd-path="conf.hdPath"
            :params="conf.params"
        ></ping-tx-dialog>

        <br />
        // example:<br />
        <label for="withdraw" class="btn">Withdraw</label>
        <ping-tx-dialog
            type="withdraw"
            :sender="conf.sender"
            :endpoint="conf.endpoint"
            :hd-path="conf.hdPath"
            :params="conf.params"
        ></ping-tx-dialog>

        <label for="store_code" class="btn">Store Code</label>
        <ping-tx-dialog
            type="store_code"
            :sender="conf.sender"
            :endpoint="conf.endpoint"
            :registry-name="conf.chainName"
            :hd-path="conf.hdPath"
            :params="conf.params"
        ></ping-tx-dialog>

        <label for="PingTokenConvert" class="btn">Token Convert</label>
        <ping-token-convert
            :chain-name="conf.chainName"
            :endpoint="conf.endpoint"
            hd-path="m/44'/118/0'/0/0"
        ></ping-token-convert>
    </div>
</template>

<style scoped></style>
