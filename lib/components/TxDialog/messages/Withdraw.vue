<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { getDelegateRewards } from '../../../utils/http'

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    params: String,
});

const rewards = ref([] as { reward: { amount: string, denom: string }, validator_address: string }[])

const msgs = computed(() => {
    return rewards.value.map(x => {
        return {
            typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
            value: {
                delegatorAddress: props.sender,
                validatorAddress: x.validator_address,
            },
        }
    })
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if (!props.sender) {
        ok = false
        error = "Sender is empty"
    }
    if (rewards.value.length === 0) {
        ok = false
        error = "No delegation found"
    }
    return { ok, error }
})

function initial() {
    getDelegateRewards(props.endpoint, props.sender).then(x => {
        rewards.value = x.rewards
    })
}

defineExpose({ msgs, isValid, initial })
</script>
<template>
    <div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Sender</span>
            </label>
            <input :value="sender" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
    </div>
</template>