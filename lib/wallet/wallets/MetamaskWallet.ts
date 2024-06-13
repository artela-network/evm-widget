import { AbstractWallet, Account, WalletArgument, WalletName, extractChainId, keyType } from '../Wallet';
import { fromBase64, fromBech32, toHex, fromHex, toBase64 } from '@cosmjs/encoding';
import {
    Registry,
    encodePubkey,
    makeAuthInfoBytes,
} from '@cosmjs/proto-signing';
import { Transaction } from '../../utils/type';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { hashMessage } from '@ethersproject/hash';
import { computePublicKey, recoverPublicKey } from '@ethersproject/signing-key';
import { ethToEthermint, ethermintToEth } from '../../utils/format';
import { AminoTypes, createDefaultAminoConverters } from "@cosmjs/stargate"
import { Chain, createTxRawEIP712, signatureToWeb3Extension } from "@tharsis/transactions";
import { createEIP712, generateFee, generateMessageWithMultipleTransactions, generateTypes } from "@tharsis/eip712";
import { defaultMessageAdapter } from '../EthermintMessageAdapter';
import { Any } from "cosmjs-types/google/protobuf/any";
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys'

export class MetamaskWallet implements AbstractWallet {
    name: WalletName.Metamask;
    chainId: string;
    registry: Registry;
    prefix: string;
    aminoTypes = new AminoTypes(createDefaultAminoConverters())

    constructor(arg: WalletArgument, registry: Registry) {
        this.chainId = arg.chainId || 'cosmoshub';
        this.registry = registry;
        this.prefix = arg.prefix || 'evmos'
    }

    async getAccounts(): Promise<Account[]> {
        // @ts-ignore
        if (!window.ethereum || !window.ethereum.request) {
            throw new Error('Please install Metamask extension');
        }

        // @ts-ignore46
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        const message = 'Verify Public Key';
        // @ts-ignore
        const signature = await window?.ethereum?.request({
            method: 'personal_sign',
            params: [message, accounts[0], ''],
        });

        const uncompressedPk = recoverPublicKey(
            hashMessage(message),
            signature
        );
        const hexPk = computePublicKey(uncompressedPk, true);
        const pk = toBase64(fromHex(hexPk.replace('0x', '')));

        const connected = accounts.map((address) => ({
            address: ethToEthermint(address, this.prefix),
            algo: 'secp256k1',
            pubkey: pk,
        }))

        localStorage.setItem("metamask-connected", JSON.stringify(connected))

        return connected;
    }

    async getConnectedAccounts()  {
        const connected = localStorage.getItem("metamask-connected")
        if(connected) {
            return JSON.parse(connected) as Account[]
        }
        return this.getAccounts()
    }

    async supportCoinType(coinType?: string): Promise<boolean> {
        // Here, you can check if Metamask supports a specific type of cryptocurrency.
        return true;
    }

    async sign(transaction: Transaction): Promise<TxRaw | Uint8Array> {
        const { signerAddress, messages, fee, signerData } =
            transaction;

        const senderHexAddress = ethermintToEth(signerAddress);
        const chain: Chain = {
            chainId: extractChainId(signerData.chainId),
            cosmosChainId: signerData.chainId,
        }

        //console.log("chainId:", signerData.chainId)

        // getAccounts
        const accounts = await this.getConnectedAccounts(); 
        const account = accounts.find(acc => ethermintToEth(acc.address) === senderHexAddress );
        if (!account) {
            throw new Error('Account not found');
        }

        //console.log("account hex:", senderHexAddress)
        //console.log("account:", account)

        const pubkeyBytes = String(account.pubkey)
        //console.log("toBase64(pubkeyBytes)", pubkeyBytes)

        const sender = {
            accountAddress: transaction.signerAddress,
            sequence: transaction.signerData.sequence,
            accountNumber: transaction.signerData.accountNumber,
            pubkey: pubkeyBytes,
        }

        const fees = generateFee(transaction.fee.amount[0].amount, transaction.fee.amount[0].denom, transaction.fee.gas, transaction.signerAddress)

        const msgs = transaction.messages.map(x => this.aminoTypes.toAmino(x))
        const toSignTx = generateMessageWithMultipleTransactions(
            sender.accountNumber.toString(),
            sender.sequence.toString(),
            transaction.signerData.chainId,
            transaction.memo,
            fees,
            msgs,
        )

        const types = generateTypes(defaultMessageAdapter[transaction.messages[0].typeUrl].getTypes())
        const eip712Payload = createEIP712(types, chain.chainId, toSignTx)

        // Obtaining the data required for MetaMask signature
        // @ts-ignore
        // const acc = await window.ethereum.request({ method: 'eth_requestAccounts' });
        // console.log("accounts: ", acc)

        // const eip712Payload = JSON.stringify(messages[0]);

        // Signing an EIP-712 payload using MetaMask.
        // @ts-ignore
        const signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [senderHexAddress, JSON.stringify(eip712Payload)],
        });

        // Creating a TxRaw object after signing.
        const signatureBytes = fromHex(signature.replace('0x', ''));
        const txBodyBytes = this.registry.encode({
            typeUrl: '/cosmos.tx.v1beta1.TxBody',
            value: { messages },
        });

        

        // NOTE: assume ethsecp256k1 by default because after mainnet is the only one that is going to be supported
        const pubkey = Any.fromPartial({
            typeUrl: keyType(signerData.chainId),
            value: PubKey.encode({
                key: fromBase64(pubkeyBytes),
            }).finish()
        })

        const authInfoBytes = makeAuthInfoBytes(
            [{ pubkey, sequence: signerData.sequence }],
            fee.amount,
            Number(fee.gas),
            undefined, // feeGranter
            undefined // feePayer
        );

        //  Using TxRaw.fromPartial to create a TxRaw object with attribute values.
        const signedTx: TxRaw = TxRaw.fromPartial({
            bodyBytes: txBodyBytes,
            authInfoBytes: authInfoBytes,
            signatures: [signatureBytes],
        });

        //console.log('signatureBytes:', signatureBytes);
        //console.log('txBodyBytes:', txBodyBytes);
        //console.log('pubkey:', pubkey);
        //console.log('authInfoBytes:', authInfoBytes);
        //console.log('signedTx:', signedTx);

        return signedTx;        // Create the txRaw
    }   
}
