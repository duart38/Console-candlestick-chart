/*
 *   Copyright (c) 2022 Duart Snel

 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.

 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.

 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { TOHLC } from "../interfaces/OHLC.ts";
import { Symbols } from "../utils/Symbols.ts";

export class Candle {
    /**
     * Represent all symbols of this candle from top to bottom. Symbols stored here should already be colored.
     * Example below:
     * ```
     * 0: ╽
     * 1: ┃
     * 2: ╿
     * ```
     * > index represents row numbers, for column position of the (entire) candle refer to the order the candles are stored in.
     */
    public segments: string[] = [];
    constructor(public data: TOHLC){ }

    resizeSegmentList(newSize: number){
        this.segments = new Array(newSize).fill(Symbols.empty);
    }
    clearSegments(){
        this.segments.fill(Symbols.empty);
    }
  
    get timestamp(){return this.data[0];}
    get open(){return this.data[1];}
    get high(){return this.data[2];}
    get low(){return this.data[3];}
    get close(){return this.data[4];}

    get bodyBottom(){return Math.min(this.open, this.close);}
    get bodyTop(){return Math.max(this.open, this.close);}
    get wickBottom(){return Math.min(this.high, this.low);}
    get wickTop(){return Math.max(this.high, this.low);}

    isValid(){
        return this.open !== undefined &&
        this.high !== undefined &&
        this.low !== undefined &&
        this.close !== undefined;
    }
  
    isBearish(){return this.open > this.close}
    isBullish(){return !this.isBearish}

    /**
     * Adds an effect to the candle to be drawn (e.g., turn the candle purple or change the bg color).
     * Supply with a method that wraps the passed parameter within ANSI escape color code. [Example of ANSI codes](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797#color-codes)
     * @param entireColumn indicated if should change the entire column (top to bottom) or just the candle/wick bits
     */
    addEffect(method: (x:string)=>string, entireColumn = false){
        this.segments = this.segments.map(s=>entireColumn ? method(s) : (s.includes(Symbols.empty) ? s : method(s)));
    }

}