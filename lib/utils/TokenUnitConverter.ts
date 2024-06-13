import { Coin, CoinMetadata } from "./type";
import BigNumber from 'bignumber.js';

export class TokenUnitConverter {
    metadata: Record<string, CoinMetadata>
    constructor(metas?: Record<string, CoinMetadata> ) {
        this.metadata = metas? metas: {}
    }
    addMetadata(denom: string, meta: CoinMetadata) {
        this.metadata[denom] = meta
    }
    baseToDisplay(token: Coin, decimal = 6) {
        const meta = this.metadata[token.denom]
        if(!meta) return token
        const unit = meta.denom_units.find(unit => unit.denom === meta.display)
        if(!unit) return token
        const amount = BigNumber(Number(token.amount)).div(BigNumber(10).pow(unit.exponent))  
        return {
            amount: amount.toFixed(decimal),
            denom: unit.denom.toUpperCase()
        }
    }
    baseToUnit(token: Coin, unitName: string, decimal = 6) {
        const meta = this.metadata[token.denom]
        if(!meta) return token
        const unit = meta.denom_units.find(unit => unit.denom === unitName)
        if(!unit) return token
        const amount = BigNumber(Number(token.amount)).div(BigNumber(10).pow(unit.exponent))  
        return {
            amount: parseFloat(amount.toFixed(decimal)).toString(),
            denom: unit.denom
        }
    }
    displayToBase(baseDenom: string, display: Coin) {
        const meta = this.metadata[baseDenom]
        if(!meta) return display
        const unit = meta.denom_units.find(unit => unit.denom === display.denom)
        if(!unit) return display
        const amount = BigNumber(Number(display.amount)).times(BigNumber(10).pow(unit.exponent))
        return {
            amount: amount.toFixed(),
            denom: baseDenom
        }
    }
}