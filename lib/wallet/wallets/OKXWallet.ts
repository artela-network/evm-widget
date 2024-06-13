import { fromBase64, fromHex } from '@cosmjs/encoding';
import { makeAuthInfoBytes, makeSignBytes, makeSignDoc, Registry, TxBodyEncodeObject } from '@cosmjs/proto-signing';

import { serializeSignDoc } from '@cosmjs/amino/build/signdoc';

import { AbstractWallet, Account, IChain, WalletArgument, WalletName } from '../Wallet';
import { Transaction } from '../../utils/type';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AminoTypes, createDefaultAminoConverters, createIbcAminoConverters } from '@cosmjs/stargate';
import { makeSignDoc as makeSignDocAmino } from '@cosmjs/amino';
import { createWasmAminoConverters } from '@cosmjs/cosmwasm-stargate';
import { Buffer } from 'buffer';

export class OKXWallet implements AbstractWallet {
  name: WalletName.OKX = WalletName.OKX;
  chainId: string;
  chain: IChain;
  registry: Registry;
  conf: WalletArgument;
  aminoTypes = new AminoTypes({
    ...createDefaultAminoConverters(),
    ...createIbcAminoConverters(),
    ...createWasmAminoConverters(),
  });

  connectEventNamesOnWindow: string[] = [];

  constructor(arg: WalletArgument, chain: IChain, registry: Registry) {
    this.chainId = arg.chainId || "cosmoshub";
    // @ts-ignore

    this.registry = registry;
    this.conf = arg;
    this.chain = chain;
  }
  async getAccounts(): Promise<Account[]> {
    // @ts-ignore

    if (!window?.okxwallet) {
      throw new Error("Please install OKX wallet extension");
    }
    // @ts-ignore
    const connectRes = await window.okxwallet.bitcoin.connect();
    console.log("connectRes: ", connectRes);

    // @ts-ignore
    const accounts = await window.okxwallet.bitcoin.getAccounts();

    // @ts-ignore
    const pbk = await window.okxwallet.bitcoin.getPublicKey();

    return [
        {
            address: accounts[0],
            pubkey: fromHex(pbk),
            algo: 'segwit',
        },
    ];
  }
  supportCoinType(): Promise<boolean> {
    return Promise.resolve(true);
  }

  isEthermint() {
    return this.conf.hdPath && this.conf.hdPath.startsWith("m/44'/60");
  }

  async sign(transaction: Transaction): Promise<TxRaw> {
    // return this.signDirect(transaction);
    return this.signAmino(transaction);
  }
  // @deprecated use signAmino instead
  // because signDirect is not supported ledger wallet
  async signDirect(transaction: Transaction): Promise<TxRaw> {
    const accouts = await this.getAccounts();

    const accountFromSigner = accouts[0];
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }
    const pubkey = Any.fromPartial({
      typeUrl: "/cosmos.crypto.segwit.PubKey",
      value: PubKey.encode({
        key: accountFromSigner.pubkey,
      }).finish(),
    });

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
      transaction.fee.payer
    );

    const signDoc = makeSignDoc(
      txBodyBytes,
      authInfoBytes,
      transaction.chainId,
      transaction.signerData.accountNumber
    );
    console.log("signDoc: ", signDoc);

    const signDocBuffer = makeSignBytes(signDoc);

    const signString = Buffer.from(signDocBuffer).toString();

    // @ts-ignore
    const signature = await window.okxwallet.bitcoin.signMessage(
      signString,
      "ecdsa"
    );

    const signed = signDoc;

    return TxRaw.fromPartial({
      bodyBytes: signed.bodyBytes,
      authInfoBytes: signed.authInfoBytes,
      signatures: [fromBase64(signature)],
    });
  }

  async signAmino(tx: Transaction): Promise<TxRaw> {
    const accouts = await this.getAccounts();

    const accountFromSigner = accouts[0];
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }
    const pubkey = Any.fromPartial({
      typeUrl: "/cosmos.crypto.segwit.PubKey",
      value: PubKey.encode({
        key: accountFromSigner.pubkey,
      }).finish(),
    });

    const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
    const msgs = tx.messages.map((msg) => this.aminoTypes.toAmino(msg));
    const signDoc = makeSignDocAmino(
      msgs,
      tx.fee,
      tx.chainId,
      tx.memo,
      tx.signerData.accountNumber,
      tx.signerData.sequence
    );

    const signed = signDoc;

    const signDocBuffer = serializeSignDoc(signDoc);

    const signString = Buffer.from(signDocBuffer).toString();

    // @ts-ignore
    const signature = await window.okxwallet.bitcoin.signMessage(
      signString,
      "ecdsa"
    );

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
      signMode
    );

    return TxRaw.fromPartial({
      bodyBytes: signedTxBodyBytes,
      authInfoBytes: signedAuthInfoBytes,
      signatures: [fromBase64(signature)],
    });
  }
}
