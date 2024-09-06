<script lang="ts" setup>
import { PropType, computed, ref } from 'vue';
import { CoinMetadata } from '../../../utils/type';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))
const option = ref("1")

const msgs = computed(() => {
    return [{
        typeUrl: '/cosmos.gov.v1beta1.MsgVote',
        value: {
            voter: props.sender,
            proposalId: params.value.proposal_id,
            option: Number(option.value),
        },
    }]
})
const isValid = computed(() => {
    let ok = true
    let error = ""
    if(!params.value.proposal_id) {
        ok = false
        error = "Proposal id is empty"
    }
    if(!option.value) {
        ok = false
        error = "Vote is empty"
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
                <span class="label-text">Current Address(cosmos)</span>
            </label>
            <input :value="sender" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Option</span>
            </label>
            <div class="flex">
                <input v-model="option" type="radio" id="yes" value="1" class="radio radio-success mx-2"/><label for="yes"> Yes</label> 
                <input v-model="option" type="radio" id="no" value="3" class="radio radio-error mx-2" /><label for="no"> No</label> 
                <input v-model="option" type="radio" id="veto" value="4" class="radio radio-error mx-2" /><label for="veto"> No With Veto</label> 
                <input v-model="option" type="radio" id="abstain" value="2" class="radio radio-dark mx-2" /><label for="abstain"> Abstain</label> 
            </div>
        </div>
    </div>
</template>