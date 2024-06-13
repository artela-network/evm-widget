<script lang="ts" setup>
import { PropType, computed, ref } from 'vue';
import * as fflate from 'fflate';

const props = defineProps({
    endpoint: { type: String, required: true },
    sender: { type: String, required: true },
    params: String,
});

const bytecode = ref(new Uint8Array())
const addresses = ref("")
const permission = ref('3')
const zip = ref('gzip')

function loadWasm(event) {
    const file =  event.target.files[0]
    if(file) {
        var reader = new FileReader();    
        reader.addEventListener('load', (e)=>{
            if(e.target) {
                if(zip.value === 'gzip') {
                    bytecode.value = fflate.compressSync(new Uint8Array(e.target.result as ArrayBuffer))
                }
                bytecode.value = new Uint8Array(e.target.result as ArrayBuffer)
            }
        });        
        reader.readAsArrayBuffer(file);
    }
}

const msgs = computed(() => {
    return [{
        typeUrl: '/cosmwasm.wasm.v1.MsgStoreCode',
        value: {
            sender: props.sender,
            wasmByteCode: bytecode.value,
            instantiatePermission: {
                permission: permission.value,
                addresses: addresses.value.split(","),
            },
        },
    }]
})
const isValid = computed(() => {
    let ok = true
    let error = ""
    if( bytecode.value.length < 1) {
        ok = false
        error = "No contract is selected"
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
                <span class="label-text">Permission</span>
            </label>
            <div class="flex">
                <input v-model="permission" type="radio" id="nobody" value="1" class="radio radio-error mx-2" /><label for="nobody">Nobody</label> 
                <input v-model="permission" type="radio" id="everyone" value="3" class="radio radio-success mx-2" /><label for="everyone">Everybody</label> 
                <input v-model="permission" type="radio" id="anyofaddress" value="4" class="radio radio-success mx-2" /><label for="anyofaddress">Any Of addresses</label>
            </div>
        </div>
        <div v-if="permission === '4'" class="form-control">
            <label class="label">
                <span class="label-text">Addresses</span>
            </label>
            <input v-model="addresses" type="text" placeholder="use ',' for addresses" class="input border border-gray-300 dark:border-gray-600" />
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Compressing</span>
            </label>
            <div class="flex">
                <input v-model="zip" type="radio" id="raw" value="raw" class="radio mx-2" /><label for="raw">Raw</label> 
                <input v-model="zip" type="radio" id="gzip" value="gzip" class="radio mx-2" /><label for="gzip">Gzip</label> 
            </div>
        </div>
        <div class="form-control">
            <label class="label">
                <span class="label-text">Contract</span>
            </label>
            <input type="file" class="file-input" @change="loadWasm"/>
        </div>
    </div>
</template>