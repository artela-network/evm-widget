<script lang="ts" setup>
import { PropType, computed, onMounted, ref } from 'vue';
import { Coin, CoinMetadata } from '../../../utils/type';
import { getStakingParam } from '../../../utils/http';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';

const props = defineProps({
    endpoint: {type: String, required: true },
    sender: {type: String, required: true},
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))
const denom = ref("")
const amount = ref("")
const amountDenom = ref("")

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    const base = props.balances?.find(x => x.denom === denom.value) || { amount: "0", denom: denom.value }
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value)
    }
})

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    return [{
        typeUrl: '/cosmos.gov.v1beta1.MsgDeposit',
        value: {
          depositor: props.sender,
          proposalId: params.value.proposal_id,
          amount: [convert.displayToBase(denom.value, {
            amount: String(amount.value),
            denom: amountDenom.value
          })],
        },
      }]
})

const units = computed(() => {
    if(!props.metadata || !props.metadata[denom.value]) {
        amountDenom.value = denom.value
        return [{denom: denom.value, exponent: 18, aliases: ["ART"]}]
    }
    const list = props.metadata[denom.value].denom_units.sort((a, b) => b.exponent - a.exponent)
    if(list.length > 0) amountDenom.value = list[0].denom
    return list
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if(!params.value.proposal_id) {
        ok = false
        error = "Proposal id is empty"
    }
    if(!(Number(amount.value) > 0)) {
        ok = false
        error = "Amount should be great than 0"
    }
    return { ok, error }
})

function initial() {
    getStakingParam(props.endpoint).then(x => {
        denom.value = x.params.bond_denom
    })
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
                <span class="label-text">Amount</span>
                <span>{{ available?.display.amount }}{{ available?.display.denom }}</span>
            </label>
            <label class="input-group">
                <input v-model="amount" type="number" :placeholder="`Available: ${available?.display.amount}`" class="input border border-gray-300 dark:border-gray-600 w-full dark:text-white" />
                <select v-model="amountDenom" class="select select-bordered dark:text-white">
                    <option v-for="u in units">{{ u.denom }}</option>
                </select>
            </label>
        </div>
    </div>
</template>
