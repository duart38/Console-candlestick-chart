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

import { TOHLC } from "./interfaces/OHLC.ts";
import ChartChecker from "./utils/ChartCheckers.ts";
import { Symbols } from "./utils/Symbols.ts";


export class Chart {
  public lowest_point: number;
  public highest_point: number;
  public priceIncrement: number;
  private rows: number;
  private cols: number;
  private chartS: Array<Array<string>>;

  // TODO: options to pass in custom Symbols etc
  constructor(public data: Array<TOHLC>) {

    this.lowest_point = data.reduce((prev, curr) => curr[3] < prev ? curr[3] : prev, Infinity);
    this.highest_point = data.reduce((prev, curr) => curr[2] > prev ? curr[2] : prev, 0);

    // TODO: check if deno is not available.. default to other thing
    this.rows = Deno.consoleSize(Deno.stdout.rid).rows - 5;
    this.priceIncrement = ((this.highest_point + 1) - (this.lowest_point - 1)) / (this.rows);
    this.cols = data.length;

    const cc = new ChartChecker(this.priceIncrement);

    this.chartS = new Array(this.rows + 1);
    for (let c = 0; c < this.chartS.length; c++) {
      this.chartS[c] = new Array(this.cols).fill(Symbols.empty);
    }



    for (let row = 0; row < this.chartS.length; row++) {
      const rowPrice = this.calculateRowPrice(row);
      for (let col = 0; col < this.chartS[row].length; col++) { // TODO: maybe a safer approach would be to check against data.length
        const columnOHLC = data[col];
        const colored = columnOHLC[1] > columnOHLC[4] ? red : green;
        // TODO: check if within range here to avoid re-calculating it in every method

        // TODO: split checking up between single block candlestick chekcs and multi-block ones.. (i.e., small doji == one block)
        if (cc.isStarDoji(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.star_doji_thick);
        } else if (cc.isGraveStoneDoji(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.gravestone_doji);
        } else if (cc.isDragonFlyDoji(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.dragonfly_doji);
        } else if (cc.isNoMovement(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.no_movement);
        } else if (cc.isShortTopWick(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.half_wick_top);
        } else if (cc.isTopWick(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.body_to_wick_top);
        } else if (cc.isShortBottomWick(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.half_wick_bottom);
        } else if (cc.isBottomWick(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.body_to_wick_bottom);
        } else if (cc.isWick(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.full_wick);
        } else if (cc.isShortBodyTop(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.half_body_top);
        } else if (cc.isShortBodyBottom(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.half_body_bottom);
        } else if (cc.isBody(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.full_body);
        } else if (cc.isTooGranularTop(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.too_granular_top);
        } else if (cc.isTooGranularBottom(rowPrice, columnOHLC)) {
          this.chartS[row][col] = bgBlue(colored(Symbols.too_granular_bottom));
        } else {
          this.chartS[row][col] = Symbols.empty;
        }
      }
    }
  }

  private calculateRowPrice(rowNr: number) {
    return (this.chartS.length - 1 - rowNr) * this.priceIncrement + this.lowest_point;
  }

  public render() {
    let chartString = "";
    // `price incr(${priceIncrement}) - top(${highest_point}) - bottom(${lowest_point})`
    // TODO: Dates, horizontally

    for (let row = 0; row < this.chartS.length; row++) {
      const rowPrice = this.calculateRowPrice(row);
      const rowPriceForChart = rowPrice.toFixed(2).toString().padStart(this.highest_point.toString().length)
      chartString += rowPriceForChart + "├" + this.chartS[row].join("") + "\n";
    }
    return chartString;
  }
}



const RESET = '\x1b[0m';

// TODO: make body bright green and wick normal green
function green(x: string) {
  return `\x1b[32m${x}${RESET}`
}
function red(x: string) {
  return `\x1b[31m${x}${RESET}`
}
function bold(x: string) {
  return `\x1b[1m${x}${RESET}`
}

function bgBlue(x: string) {
  return `\x1b[44m${x}${RESET}`;
}
