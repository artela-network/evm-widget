<script lang="ts" setup>
import { ComputedRef, PropType, computed, onMounted, ref } from 'vue';
import { getActiveValidators, getDelegations, getInactiveValidators, getStakingParam } from '../../../utils/http'
import { decimal2percent } from '../../../utils/format'
import { Coin, CoinMetadata } from '../../../utils/type';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';
const props = defineProps({
    endpoint: {type: String, required: true },
    sender: {type: String, required: true},
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});
const params = computed(() => JSON.parse(props.params || "{}"))

const validator = ref('')

const activeValidators = ref([])
const inactiveValidators = ref([])
const stakingDenom = ref("")
const amount = ref("")
const amountDenom = ref("")
const delegation = ref({} as Coin)
const error = ref("")

const sourceValidator = computed(() => {
    // @ts-ignore
    const v = activeValidators.value.find(v => v.operator_address === params.validator_address)
    if(v) {
        // @ts-ignore
        return `${v.description.moniker} (${decimal2percent(v.commission.commission_rates.rate)}%)`
    }
    return params.value.validator_address
})

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    return [{
        typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        value: {
          delegatorAddress: props.sender,
          validatorSrcAddress: params.value.validator_address,
          validatorDstAddress: validator.value,
          amount: convert.displayToBase(delegation.value.denom, {
            amount: String(amount.value),
            denom: amountDenom.value,
          }),
        },
      }]
})

const list: ComputedRef<{
    operator_address: string, 
    description: {moniker: string}
    commission: { commission_rates: {rate: string}}
    status: string
}[]> = computed(() => {
    return [...activeValidators.value, ...inactiveValidators.value]
})

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    const base = delegation.value || { amount: "0", denom: stakingDenom.value }
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value)
    }
})

const units = computed(() => {
    if(!props.metadata || !props.metadata[stakingDenom.value]) {
        amountDenom.value = stakingDenom.value
        return [{denom: stakingDenom.value, exponent: 18, aliases: ["ART"]}]
    }
    const list = props.metadata[stakingDenom.value].denom_units.sort((a, b) => b.exponent - a.exponent)
    if(list.length > 0) amountDenom.value = list[0].denom
    return list
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if(!validator.value) {
        ok = false
        error = "Validator is empty"
    }
    if(!validator.value) {
        ok = false
        error = "Validator is empty"
    }
    if(!(Number(amount.value) > 0)) {
        ok = false
        error = "Amount should be great than 0"
    }
    return { ok, error }
})


function initial() {
    getDelegations(props.endpoint, params.value.validator_address, props.sender).then(x => {
        delegation.value = x.delegation_response.balance
    }).catch(err => {
        error.value = err
    })

    getStakingParam(props.endpoint).then((x) => {
        stakingDenom.value = x.params.bond_denom;
        // unbondingTime.value = x.params.unbonding_time;
    });

    getActiveValidators(props.endpoint).then(x => {
        activeValidators.value = x.validators
        validator.value = x.validators.find(v => v.description.identity === '6783E9F948541962')?.operator_address
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
                <span class="label-text">Source Validator</span>
            </label>
            <input :value="sourceValidator" type="text" class="input border border-gray-300 dark:border-gray-600 dark:text-white" readonly/>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Destination Validator</span>
            </label>
            <select v-model="validator" class="select select-bordered dark:text-white">
                <option value="">Select a validator</option>
                <option v-for="v in list" :value="v.operator_address">
                    {{ v.description.moniker }} ({{ decimal2percent(v.commission.commission_rates.rate) }}%)
                    <span v-if="v.status !== 'BOND_STATUS_BONDED'">x</span>
                </option>
            </select>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Amount</span>
                <span>{{ available?.display.amount }}{{ available?.display.denom }}</span>
            </label>
            <label class="input-group">
                <input v-model="amount" type="number" :placeholder="`Available: ${available?.display.amount}${available?.display.denom}`" class="input border border-gray-300 dark:border-gray-600 w-full dark:text-white" />
                <select v-model="amountDenom" class="select select-bordered dark:text-white">
                    <option v-for="u in units">{{ u.denom }}</option>
                </select>
            </label>
        </div>
        <div class="text-error">
            {{ error }}
        </div>
    </div>
</template>
