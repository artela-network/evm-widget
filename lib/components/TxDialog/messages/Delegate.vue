<script lang="ts" setup>
import { ComputedRef, PropType, computed, onMounted, ref } from 'vue';
import {
    getActiveValidators,
    getInactiveValidators,
    getStakingParam,
} from '../../../utils/http';
import { decimal2percent } from '../../../utils/format';
import { Coin, CoinMetadata } from '../../../utils/type';
import { TokenUnitConverter } from '../../../utils/TokenUnitConverter';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    balances: Object as PropType<Coin[]>,
    metadata: Object as PropType<Record<string, CoinMetadata>>,
    params: String,
});
const params = computed(() => JSON.parse(props.params || '{}'));

const validator = ref('');

const activeValidators = ref([]);
const inactiveValidators = ref([]);
const stakingDenom = ref('');
const unbondingTime = ref('');
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
const amountDenom = ref('');

const msgs = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    return [
        {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
                delegatorAddress: props.sender,
                validatorAddress: validator.value,
                amount: convert.displayToBase(stakingDenom.value, {
                    amount: String(amount.value),
                    denom: amountDenom.value,
                }),
            },
        },
    ];
});

const list: ComputedRef<
    {
        operator_address: string;
        description: { moniker: string };
        commission: { commission_rates: { rate: string } };
        status: string;
    }[]
> = computed(() => {
    return [...activeValidators.value, ...inactiveValidators.value];
});

const available = computed(() => {
    const convert = new TokenUnitConverter(props.metadata);
    const base = props.balances?.find(
        (x) => x.denom === stakingDenom.value
    ) || { amount: '0', denom: stakingDenom.value };
    return {
        base,
        display: convert.baseToUnit(base, amountDenom.value),
    };
});

function loadInactiveValidators() {
    getInactiveValidators(props.endpoint).then((x) => {
        inactiveValidators.value = x.validators;
    });
}

const units = computed(() => {
        amountDenom.value = stakingDenom.value;
        return [
            { denom: stakingDenom.value, exponent: 18, aliases: ["ART"] }
        ];
});

const isValid = computed(() => {
    let ok = true;
    let error = '';
    if (!validator.value) {
        ok = false;
        error = 'Validator is empty';
    }
    if (!(Number(amount.value) > 0)) {
        ok = false;
        error = 'Amount should be great than 0';
    }
    if (!amountDenom.value) {
        ok = false;
        error = 'Amount Denom is empty';
    }
    return { ok, error };
});

function initial() {
    activeValidators.value = [];
    validator.value = params.value.validator_address;
    getStakingParam(props.endpoint).then((x) => {
        stakingDenom.value = x.params.bond_denom;
        unbondingTime.value = x.params.unbonding_time;
    });

    getActiveValidators(props.endpoint).then((x) => {
        activeValidators.value = x.validators;
        if (!params.value.validator_address) {
            validator.value = x.validators.find(
                (v) => v.description.identity === '6783E9F948541962'
            )?.operator_address;
        }
    });
}

defineExpose({ msgs, isValid, initial });
</script>
<template>
    <div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input
                :value="sender"
                type="text"
                class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600"
            />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Validator</span>
                <a class="label-text" @click="loadInactiveValidators()"
                    >Show Active</a
                >
            </label>
            <select v-model="validator" class="select select-bordered dark:text-white">
                <option value="">Select a validator</option>
                <option v-for="v in list" :value="v.operator_address" v-show="v.status === 'BOND_STATUS_BONDED'">
                    {{ v.description.moniker }} ({{
                        decimal2percent(v.commission.commission_rates.rate)
                    }}%)
                    <!-- <span v-if="v.status !== 'BOND_STATUS_BONDED'">x</span> -->
                </option>
            </select>
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
    </div>
</template>
