<script lang="ts" setup>
import { computed, ref } from 'vue';
import { getDelegateRewards } from '../../../utils/http';

const props = defineProps({
  endpoint: { type: String, required: true },
  sender: { type: String, required: true },
  params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))
const rewards = ref([] as { reward: { amount: string, denom: string }, validator_address: string }[])

const msgs = computed(() => {
  const delegations = rewards.value?.map(x => {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: {
        delegatorAddress: props.sender,
        validatorAddress: x.validator_address,
      },
    }
  })
  return [
    ...delegations,
    {
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
      value: {
        validatorAddress: params.value.validator_address,
      },
    },
  ]
})

const isValid = computed(() => {
  let ok = true
  let error = ""
  if (!props.sender) {
    ok = false
    error = "Sender is empty"
  }
  if (!params.value.validator_address) {
    ok = false
    error = "Validator is empty"
  }
  if (!rewards.value || rewards.value.length < 0) {
    ok = false
    error = "No delegation found"
  }
  if (rewards.value.findIndex(x => x.validator_address === params.value.validator_address) === -1) {
    ok = false
    error = "You are not the validator!"
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