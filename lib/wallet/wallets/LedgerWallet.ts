import { fromBase64, fromBech32, toHex, toBech32, toBase64 } from "@cosmjs/encoding";
import { Registry, TxBodyEncodeObject, encodePubkey, makeAuthInfoBytes } from "@cosmjs/proto-signing"
import { AbstractWallet, Account, DEFAULT_HDPATH, WalletArgument, WalletName, extractChainId } from "../Wallet"
import { AminoTypes, createDefaultAminoConverters } from "@cosmjs/stargate"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import TransportWebBLE from "@ledgerhq/hw-transport-web-ble"
import { LedgerSigner } from "@cosmjs/ledger-amino"
import { Transaction } from "../../utils/type"
import { Chain, createTxRawEIP712, signatureToWeb3Extension } from "@tharsis/transactions";
import { createEIP712, generateFee, generateMessageWithMultipleTransactions, generateTypes } from "@tharsis/eip712";
import { defaultMessageAdapter } from "../EthermintMessageAdapter";
import { createTransactionWithMultipleMessages } from "@tharsis/proto";
import { encodeSecp256k1Pubkey, makeSignDoc as makeSignDocAmino } from "@cosmjs/amino";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { stringToPath } from '@cosmjs/crypto'
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { ethermintToEth } from "../../utils/format";
import { createWasmAminoConverters } from "@cosmjs/cosmwasm-stargate";

export class LedgerWallet implements AbstractWallet {
    name: WalletName.Ledger
    transport: string
    hdPath: string
    registry: Registry
    aminoTypes = new AminoTypes({...createDefaultAminoConverters(), ...createWasmAminoConverters()})
    conf: WalletArgument
    constructor(arg: WalletArgument, registry: Registry) {
        this.transport = arg.transport || 'usb'
        this.hdPath = arg.hdPath || DEFAULT_HDPATH
        this.registry = registry
        this.conf = arg
    }

    async getSigner() {
        const transport = this.transport === 'usb' ? await TransportWebUSB.create() : await TransportWebBLE.create()
        // extract Cointype from from HDPath
        const hdPath = stringToPath(this.hdPath)
        const coinType = Number(hdPath[1])
        let ledgerAppName = 'Cosmos'
        switch (coinType) {
            case 60:
               throw new Error("Not support.")
            case 529:
                ledgerAppName = 'Secret' // 'Secret'
                break
            case 852:
                ledgerAppName = 'Desmos' // 'Desmos'
                break
            case 330:
                ledgerAppName = 'Terra' // 'Terra'
                break
            case 118:
            default:
        }
        // const path = stringToPath(this.hdPath)
        return new LedgerSigner(transport, { ledgerAppName, hdPaths: [hdPath] })
    }

    async getAccounts(): Promise<Account[]> {
        const signer = await this.getSigner();
        const account = (await signer.getAccounts()).map(x => ({
            address: x.address,
            algo: x.algo,
            pubkey: x.pubkey,
        }))
        return account
    }
    supportCoinType(coinType?: string | undefined): Promise<boolean> {
        return Promise.resolve(true);
    }
    isEthermint() {
        return this.conf.hdPath && this.conf.hdPath.startsWith("m/44'/60")
    }

    async sign(tx: Transaction): Promise<TxRaw | Uint8Array> {
        // if (this.isEthermint()) {
        //     return this.sign712(tx)
        // }
        return this.signAmino(tx)
    }

    // not finished, due to the outdated dependency.
    async sign712(tx: Transaction): Promise<Uint8Array> {
        const chain: Chain = {
            chainId: extractChainId(tx.signerData.chainId),
            cosmosChainId: tx.chainId,
        }

        const signer = await this.getSigner()
        const ethAddr = ethermintToEth(tx.signerAddress)

        // this.signer.prefix = fromBech32(signerAddress).prefix
        const account = await signer.getAccounts()

        const acc = account.find(x => x.address === ethAddr)
        if (!acc) {
            throw new Error('The signer address dose not exsits in Ledger!')
        }
        const sender = {
            accountAddress: tx.signerAddress,
            sequence: tx.signerData.sequence,
            accountNumber: tx.signerData.accountNumber,
            pubkey: toBase64(account[0].pubkey),
        }

        const fees = generateFee(tx.fee.amount[0].amount, tx.fee.amount[0].denom, tx.fee.gas, tx.signerAddress)

        const msgs = tx.messages.map(x => this.aminoTypes.toAmino(x))
        const toSignTx = generateMessageWithMultipleTransactions(
            sender.accountNumber.toString(),
            sender.sequence.toString(),
            tx.signerData.chainId,
            tx.memo,
            fees,
            msgs,
        )

        const types = generateTypes(defaultMessageAdapter[tx.messages[0].typeUrl].getTypes())
        const eip = createEIP712(types, chain.chainId, toSignTx)

        // @ts-ignore
        const sig = await this.getSigner().sign712(eip)

        const rawTx = this.makeRawTxEvmos(sender, tx.messages, tx.memo, tx.fee, sig, chain)
        return rawTx
    }

    makeRawTxEvmos(sender, messages, memo, fee, signature, chain): Uint8Array {
        /// evmos style
        /// *
        const protoMsgs = messages.map(x => {
          const adapter = defaultMessageAdapter[x.typeUrl]
          return adapter.toProto(x)
        })
      
        const evmos = createTransactionWithMultipleMessages(
          protoMsgs,
          memo,
          fee.amount[0].amount,
          fee.amount[0].denom,
          Number(fee.gas),
          'ethsecp256',
          sender.pubkey,
          sender.sequence,
          sender.accountNumber,
          chain.cosmosChainId,
        )
      
        const extension = signatureToWeb3Extension(chain, sender, signature)
      
        // Create the txRaw
        const prototx = createTxRawEIP712(evmos.legacyAmino.body, evmos.legacyAmino.authInfo, extension)
        return prototx.message.serializeBinary()
        /// end of EVMOS style */
    }
      

    async signAmino(tx: Transaction): Promise<TxRaw> {
        const signer = await this.getSigner();
        // assert(!isOfflineDirectSigner(signer));

        const accounts = await this.getAccounts()
        const {data} = fromBech32(tx.signerAddress)
        const hex = toHex(data)
        const signerAddress = toBech32("cosmos", data)
        const accountFromSigner = accounts.find((account) => toHex(fromBech32(account.address).data) === hex);
        if (!accountFromSigner) {
            throw new Error("Failed to retrieve account from signer");
        }
        const pubkey = encodePubkey(encodeSecp256k1Pubkey(accountFromSigner.pubkey));
        const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
        const msgs = tx.messages.map((msg) => this.aminoTypes.toAmino(msg));
        const signDoc = makeSignDocAmino(msgs, tx.fee, tx.chainId, tx.memo, tx.signerData.accountNumber, tx.signerData.sequence);
        const { signature, signed } = await signer.signAmino(signerAddress, signDoc);

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