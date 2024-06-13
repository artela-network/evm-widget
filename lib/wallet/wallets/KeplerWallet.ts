import { fromBase64, fromBech32, toHex } from "@cosmjs/encoding";
import { Registry, TxBodyEncodeObject, encodePubkey, makeAuthInfoBytes, makeSignDoc } from "@cosmjs/proto-signing"
import { AbstractWallet, Account, WalletArgument, WalletName, keyType } from "../Wallet"
import { Transaction } from "../../utils/type"
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Any } from "cosmjs-types/google/protobuf/any";
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys'
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { AminoTypes, createDefaultAminoConverters } from "@cosmjs/stargate";
import { encodeSecp256k1Pubkey, makeSignDoc as makeSignDocAmino } from "@cosmjs/amino";
import { createWasmAminoConverters } from "@cosmjs/cosmwasm-stargate";

export class KeplerWallet implements AbstractWallet {
    name: WalletName.Keplr
    chainId: string
    registry: Registry
    conf: WalletArgument
    aminoTypes = new AminoTypes( {...createDefaultAminoConverters(), ...createWasmAminoConverters()})
    constructor(arg: WalletArgument, registry: Registry) {
        this.chainId = arg.chainId || "cosmoshub"
        // @ts-ignore
        if (!window.getOfflineSigner || !window.keplr) {
            throw new Error('Please install keplr extension')
        }
        this.registry = registry
        this.conf = arg
    }
    
    async getAccounts(): Promise<Account[]> {
        // const chainId = 'cosmoshub'
        // @ts-ignore
        await window.keplr.enable(this.chainId)
        // @ts-ignore
        const offlineSigner = window.getOfflineSigner(this.chainId)
        return offlineSigner.getAccounts()
    }
    supportCoinType(coinType?: string | undefined): Promise<boolean> {
        return Promise.resolve(true);
    }
    isEthermint() {
        return this.conf.hdPath && this.conf.hdPath.startsWith("m/44'/60")
    }
    async sign(transaction: Transaction): Promise<TxRaw> {
        // sign wasm tx with signDirect
        if(transaction.messages.findIndex(x => x.typeUrl.startsWith("/cosmwasm.wasm")) > -1) {
            return this.signDirect(transaction)
        }
        return this.signAmino(transaction)
    }
    // @deprecated use signAmino instead
    // because signDirect is not supported ledger wallet
    async signDirect(transaction: Transaction): Promise<TxRaw> {
        const accouts = await this.getAccounts()
        const hex = toHex(fromBech32(transaction.signerAddress).data)
        const accountFromSigner = accouts.find((account) => toHex(fromBech32(account.address).data) === hex);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        const pubkey = Any.fromPartial({
            typeUrl: keyType(transaction.chainId),
            value: PubKey.encode({
                key: accountFromSigner.pubkey,
            }).finish()
        })
        const txBodyEncodeObject: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: {
                messages: transaction.messages,
                memo: transaction.memo,
            },
        };
        const txBodyBytes = this.registry.encode(txBodyEncodeObject);
        const gasLimit = Number(transaction.fee.gas);
        const authInfoBytes = makeAuthInfoBytes(
            [{ pubkey, sequence: transaction.signerData.sequence }],
            transaction.fee.amount,
            gasLimit,
            transaction.fee.granter,
            transaction.fee.payer,
        );
        const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, transaction.chainId, transaction.signerData.accountNumber);

        // @ts-ignore
        const offlineSigner = window.getOfflineSigner(this.chainId)
        const { signature, signed } = await offlineSigner.signDirect(transaction.signerAddress, signDoc);;
        return TxRaw.fromPartial({
            bodyBytes: signed.bodyBytes,
            authInfoBytes: signed.authInfoBytes,
            signatures: [fromBase64(signature.signature)],
        });
    }

    async signAmino(tx: Transaction): Promise<TxRaw> {
        const accouts = await this.getAccounts()
        const hex = toHex(fromBech32(tx.signerAddress).data)
        const accountFromSigner = accouts.find((account) => toHex(fromBech32(account.address).data) === hex);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        // const pubkey = encodePubkey(encodeSecp256k1Pubkey(accountFromSigner.pubkey));
        const pubkey = Any.fromPartial({
            typeUrl: keyType(tx.chainId),
            value: PubKey.encode({
                key: accountFromSigner.pubkey,
            }).finish()
        })
        const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
        const msgs = tx.messages.map((msg) => this.aminoTypes.toAmino(msg));
        const signDoc = makeSignDocAmino(msgs, tx.fee, tx.chainId, tx.memo, tx.signerData.accountNumber, tx.signerData.sequence);
        
        // @ts-ignore
        const offlineSigner = window.getOfflineSigner(this.chainId)
        const { signature, signed } = await offlineSigner.signAmino(tx.signerAddress, signDoc);

        const signedTxBody = {
            messages: signed.msgs.map((msg) => this.aminoTypes.fromAmino(msg)),
            memo: signed.memo,
        };
        const signedTxBodyEncodeObject: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: signedTxBody,
        };
        const signedTxBodyBytes = this.registry.encode(signedTxBodyEncodeObject);

        const signedGasLimit = Number(signed.fee.gas);
        const signedSequence = Number(signed.sequence);
        const signedAuthInfoBytes = makeAuthInfoBytes(
            [{ pubkey, sequence: signedSequence }],
            signed.fee.amount,
            signedGasLimit,
            signed.fee.granter,
            signed.fee.payer,
            signMode,
        );
        return TxRaw.fromPartial({
            bodyBytes: signedTxBodyBytes,
            authInfoBytes: signedAuthInfoBytes,
            signatures: [fromBase64(signature.signature)],
        });
    }
}
