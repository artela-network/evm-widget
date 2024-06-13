<script setup lang="ts">
import { ref } from 'vue';
import pingWidget from 'ping-widget';
// import pingWidget from '../../lib/components/TxDialog';

const sender = 'bc1qjdyxk9t90jxmeqpdwkn8cd7nj6cu7x3m688xlj';
const endpoint = 'https://devnet-2-rpc.side.one';
// const chainId = 'juno-1';
const chainId = 'taproot-1';
const hdPath = "m/44'/60/0'/0/0";

const params = JSON.stringify({
    proposal_id: '1',
    validator_address: 'bc1qjdyxk9t90jxmeqpdwkn8cd7nj6cu7x3m688xlj',
});
console.log(`pingWidget: `, pingWidget);


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
];
const toOpen = ref('send');
</script>

<template>
    <div>
        Ping Widget Version: {{ pingWidget?.version }}

        <ping-connect-wallet :chain-id="chainId" :hd-path="hdPath" />

        <select v-model="toOpen">
            <option v-for="i in types">{{ i }}</option>
        </select>

        <br />

        <label :for="toOpen" class="btn">{{ toOpen }}</label>
        <ping-tx-dialog
            :type="toOpen"
            :sender="sender"
            :endpoint="endpoint"
            :params="params"
        ></ping-tx-dialog>

        <br />
        // example:<br />
        <label for="withdraw" class="btn">Withdraw</label>
        <ping-tx-dialog
            type="withdraw"
            :sender="sender"
            :endpoint="endpoint"
            :params="params"
        ></ping-tx-dialog>

        <label for="vote" class="btn">Vote</label>
        <ping-tx-dialog
            type="vote"
            :sender="sender"
            :endpoint="endpoint"
            :params="params"
        ></ping-tx-dialog>
    </div>
</template>

<style scoped></style>
