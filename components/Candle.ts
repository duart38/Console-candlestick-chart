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

export class Candle {
    constructor(public data: TOHLC){ }
  
    get timestamp(){return this.data[0];}
    get open(){return this.data[1];}
    get high(){return this.data[2];}
    get low(){return this.data[3];}
    get close(){return this.data[4];}
  
    isBearish(){return this.open > this.close}
    isBullish(){return !this.isBearish}
}