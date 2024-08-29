<script lang="ts" setup>
import { PropType, computed, onMounted, ref } from 'vue';
import { getDelegations } from '../../../utils/http'
import { Coin, CoinMetadata } from '../../../utils/type';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';

const props = defineProps({
    endpoint: {type: String, required: true },
    sender: {type: String, required: true},
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))
const delegation = ref({} as {balance: Coin, delegation: {delegator_address: string, shares: string, validator_address: string}})
// 作为 uart，用于发起交易
const bigAmount = ref('');

// 使用 computed 来创建双向绑定的计算属性
const amount = computed({
  get() {
    // 将 bigAmount 的值转换为 uart，默认值为 0
    return BigInt(parseFloat(bigAmount.value || '0') * 10**18);
  },
  set(newValue) {
    // 当 amount 被改变时，更新 bigAmount，确保 bigAmount 保留浮点数
    bigAmount.value = (Number(newValue) / 10**18).toString();
  }
});
const amountDenom = ref("")
const error = ref("")

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata)
    return [{
        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
        value: {
          delegatorAddress: props.sender,
          validatorAddress: params.value.validator_address,
          amount: convert.displayToBase(delegation.value.balance?.denom, {
            amount: String(amount.value),
            denom: amountDenom.value,
          }),
        },
      }]
})

const units = computed(() => {
    const denom = delegation.value.balance?.denom
    if(!props.metadata || !props.metadata[denom]) {
        amountDenom.value = denom
        return [{denom: denom, exponent: 18, aliases: ["ART"]}]
    }
    const list = props.metadata[denom].denom_units.sort((a, b) => b.exponent - a.exponent)
    if(list.length > 0) amountDenom.value = list[0].denom
    return list
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if(!props.sender) {
        ok = false
        error = "Sender is empty"
    }
    if(!params.value.validator_address) {
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
        delegation.value = x.delegation_response
    }).catch(err => {
        error.value = err
    })   
}

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    const base = delegation.value?.balance || {amount: "", denom: ""}
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value),
    };
});

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
                <span class="text-[#0000C9]">{{ (parseFloat(available.display.amount) / 10**18).toFixed(18) }} ART</span>     
            </label>
            <label class="join">
                <input
                    v-model="bigAmount"
                    type="number"
                    :placeholder="`Available: ${(parseFloat(available.display.amount) / 10**18).toFixed(18)}`"
                    class="input border border-gray-300 dark:border-gray-600 w-full join-item dark:text-white"
                />
                <select v-model="amountDenom" class="select select-bordered join-item dark:text-white">
                    <option v-for="u in units" :value="u.denom">ART</option>
                </select>
            </label>
        </div>
        <div class="text-error">{{ error }}</div>
    </div>
</template>
