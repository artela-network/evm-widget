import { EncodeObject } from '@cosmjs/proto-signing';
import { SignerData, StdFee } from '@cosmjs/stargate';
import type { App, Plugin } from 'vue';
export const withInstall = <T>(comp: T) => {
  const c = comp as any;
  c.install = function (app: App) {
    app.component(c.displayName || c.name, comp as any);
  };

  return comp as T & Plugin;
};


export interface Coin {
  amount: string,
  denom: string,
}
export interface Configuration {

}

export interface CoinMetadata {
  description: string,
  denom_units: {
    denom: string,
    exponent: number,
    aliases: string[]
  }[],
  base: string,
  display: string,
  name: string,
  symbol: string
}

export interface TxResponse {
  height: string,
  txhash: string,
  codespace: string,
  code: 0,
  data: string,
  raw_log: string,
}

export interface Transaction { 
  chainId: string; 
  signerAddress: string; 
  messages: readonly EncodeObject[]; 
  fee: StdFee; 
  memo: string; 
  signerData: SignerData 
}

export enum BroadcastMode {
  SYNC = 'BROADCAST_MODE_SYNC', 
  BLOCK = 'BROADCAST_MODE_BLOCK', 
  ASYNC = 'BROADCAST_MODE_ASYNC',
}