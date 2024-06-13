export interface TokenConfig {
    denom: string;
    symbol: string;
    ibcDenom: string;
    decimals: number;
    coinImageUrl: string;
    sourceChannelId?: string;
    destChannelId?: string;
}

export const tokens : TokenConfig[]= [
    {
        denom: "uosmo",
        symbol: "OSMO",
        ibcDenom: "uosmo", // use base denom for native token 
        decimals: 6,
        coinImageUrl: "https://app.osmosis.zone/tokens/osmo.svg",
    },
    {
        denom: "uatom",
        symbol: "ATOM",
        ibcDenom: "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2",
        sourceChannelId: "channel-0",
        destChannelId: "channel-141",
        decimals: 6,
        coinImageUrl: "https://app.osmosis.zone/tokens/atom.svg",
    },
    {
        denom: "uusdc",
        symbol: "USDC",
        ibcDenom: "ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858",
        sourceChannelId: "channel-208",
        destChannelId: "",
        decimals: 6,
        coinImageUrl: "https://app.osmosis.zone/tokens/usdc.svg",
    },
]