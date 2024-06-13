<script lang="ts" setup>
import { Coin } from '@cosmjs/amino';
import { PropType, computed, ref } from 'vue';
import { toBase64 } from '@cosmjs/encoding'
import { CoinMetadata } from '../../../utils/type';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))

const admin = ref("")
const label = ref("")
const funds = ref([] as Coin[])
const msg = ref("")

const msgs = computed(() => {
    return [{
        typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
        value: {
            /** Sender is the that actor that signed the messages */
            sender: props.sender,
            /** Admin is an optional address that can execute migrations */
            admin: admin.value,
            /** CodeID is the reference to the stored WASM code */
            codeId: params.value.codeId,
            /** Label is optional metadata to be stored with a contract instance. */
            label: label.value,
            /** Msg json encoded message to be passed to the contract on instantiation */
            msg: toBase64(new TextEncoder().encode(msg.value)),
            /** Funds coins that are transferred to the contract on instantiation */
            funds: JSON.parse(JSON.stringify(funds.value)),
        },
    }]
})

function addFunds() {
    const denom = props.balances?.at(0)?.denom || ""
    funds.value.push({ amount: "", denom })
}
function removeFunds() {
    if(funds.value.length > 0)
        funds.value.pop()
}

const isValid = computed(() => {
    let ok = true
    let error = ""
    if( Number(params.value.codeId) < 1) {
        ok = false
        error = "Code Id is not selected"
    }
    return { ok, error }
})

function initial() {
}

defineExpose({msgs, isValid, initial})

</script>
<template>
    <div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input :value="sender" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Admin</span>
            </label>
            <input v-model="admin" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Label</span>
            </label>
            <input v-model="label" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Messages</span>
            </label>
            <textarea v-model="msg" placeholder="{config: {}}" class="text-gray-600 dark:text-white textarea border !border-gray-300 dark:!border-gray-600"></textarea>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Funds</span>
                <span class="label-text">
                    <a class="btn btn-xs" @click="addFunds">+</a>
                    <a class="btn btn-xs" @click="removeFunds">-</a>
                </span>
            </label>
            <label v-for="(coin, i) in funds" class="input-group" :key="i">
                <input v-model="coin.amount" type="text" placeholder="0" class="input border border-gray-300 dark:border-gray-600 w-full dark:text-white" />
                <select v-model="coin.denom" class="select border border-gray-300 dark:border-gray-600 dark:text-white">
                    <option v-for="b in balances" :value="b.denom">{{ b.denom.substring(0, 10) }}</option>
                </select>
            </label>
        </div>
    </div>
</template>