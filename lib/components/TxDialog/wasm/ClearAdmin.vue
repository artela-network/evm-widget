<script lang="ts" setup>
import { computed, ref } from 'vue';
import { toBase64 } from '@cosmjs/encoding'

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))

const msgs = computed(() => {
    return [{
        typeUrl: '/cosmwasm.wasm.v1.MsgClearAdmin',
        value: {
            /** Sender is the that actor that signed the messages */
            sender: props.sender,
            /** contract address that can execute migrations */
            contract: params.value.contract,
        },
    }]
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if( !params.value.contract) {
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
                <span class="label-text">Contract Address</span>
            </label>
            <input type="text" readonly class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" :value="params.contract" />
        </div>
    </div>
</template>