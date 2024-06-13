<script lang="ts" setup>
import { computed, ref } from 'vue';
import { toBase64 } from '@cosmjs/encoding'

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    params: String,
});

const params = computed(() => JSON.parse(props.params || "{}"))

const newAdmin = ref("")
const msg = ref("")

const msgs = computed(() => {
    return [{
        typeUrl: '/cosmwasm.wasm.v1.MsgUpdateAdmin',
        value: {
            /** Sender is the that actor that signed the messages */
            sender: props.sender,
            /** contract address that can execute migrations */
            contract: params.value.contract,
            /** CodeID is the reference to the stored WASM code */
            newAdmin: newAdmin.value,
            /** Msg json encoded message to be passed to the contract on instantiation */
            msg: toBase64(new TextEncoder().encode(msg.value)),
        },
    }]
})

const isValid = computed(() => {
    let ok = true
    let error = ""
    if( !params.value.contract) {
        ok = false
        error = "Contract is not selected!"
    }
    if( !newAdmin.value) {
        ok = false
        error = "Admin should not be empty!"
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

        <div class="form-control">
            <label class="label">
                <span class="label-text">New Admin</span>
            </label>
            <input v-model="newAdmin" type="text" class="text-gray-600 dark:text-white input border !border-gray-300 dark:!border-gray-600" />
        </div>

    </div>
</template>