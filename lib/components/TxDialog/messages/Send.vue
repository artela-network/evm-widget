<script lang="ts" setup>
import { PropType, computed, onMounted, ref } from 'vue';
import {
    getStakingParam,
} from '../../../utils/http';
import { Coin, CoinMetadata } from '../../../utils/type';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';
const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});

const amount = ref('');
const recipient = ref('');
const denom = ref('');
const amountDenom = ref('')

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    return [
        {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
                fromAddress: props.sender,
                toAddress: recipient.value,
                amount: [
                    convert.displayToBase(denom.value, {
                        amount: String(amount.value),
                        denom: amountDenom.value
                    })
                ],
            },
        },
    ];
});

const available = computed(() => {
    const base  = (
        props.balances?.find((x) => x.denom === denom.value) || {
            amount: '0',
            denom: '-',
        }
    )
    const convert = new TokenUnitConverter(props.metadata)
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value)
    };
});

const showBalances = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    return props.balances?.map(b => ({
        base: b,
        display: convert.baseToDisplay(b)
    })) || []
})

const units = computed(() => {
        amountDenom.value = denom.value
        return [
            {denom: denom.value, exponent: 18, aliases: ["ART"]}
        ]
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if(!recipient.value) {
        ok = false
        error = "Recipient is empty"
    }
    if(!(Number(amount.value) > 0)) {
        ok = false
        error = "Amount should be great than 0"
    }
    return { ok, error }
})


function initial() {
    denom.value = props.params?.fees?.denom || '';
    // getStakingParam(props.endpoint).then((x) => {
    //     denom.value = x.params?.bond_denom;
    // });
}

function formatDenom(v: any) {
    return String(v).substring(0, 10)
}

defineExpose({msgs, isValid, initial})
</script>
<template>
    <div class="dark:text-gray-400">
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input :value="sender" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Balances</span>
            </label>
            <select v-model="denom" class="select select-bordered dark:text-white">
                <option value="">Select a token</option>
                <option v-for="{base, display} in showBalances" :value="base.denom">
                    {{ display.amount }} {{ display.denom }}
                </option>
            </select>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Recipient</span>
            </label>
            <input
                v-model="recipient"
                type="text"
                class="input border border-gray-300 dark:border-gray-600 dark:text-white"
            />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Amount</span>
                <span>{{ available.display.amount }} {{ formatDenom(available.display.denom) }}</span>
            </label>
            <label class="input-group">
                <input v-model="amount" type="number" :placeholder="`Available: ${available?.display.amount}`" class="input border border-gray-300 dark:border-gray-600 w-full dark:text-white" />
                <select v-model="amountDenom" class="select select-bordered dark:text-white">
                    <option v-for="u in units" :value="u.denom">{{ formatDenom(u.denom) }}</option>
                </select>
            </label>
        </div>
    </div>
</template>
