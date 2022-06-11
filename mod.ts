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


type OHLCArray = Array<TOHLC>;
const data: OHLCArray = ((await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=eur&days=1")
                          .then(x=>x.json())) as OHLCArray)
                          .slice(-(Deno.consoleSize(Deno.stdout.rid).columns-10)) // TODO: 10 is too static.. figure something out
                          
// Dumping for testing
Deno.writeTextFileSync("DUMP.json", JSON.stringify(data));





const lowest_point = data.reduce((prev, curr)=> curr[3] < prev ? curr[3] : prev, Infinity);
const highest_point = data.reduce((prev, curr)=> curr[2] > prev ? curr[2] : prev, 0);

// TODO: check if deno is not available.. default to other thing
const rows = Deno.consoleSize(Deno.stdout.rid).rows - 5;
const priceIncrement = ((highest_point+1) - (lowest_point-1)) / (rows);


// const cols = data.length;
const cols = data.length;


// chart += `\n${' '.repeat(cols)}`.repeat(rows);
/*
[
  ["│", "", "", ""],
  ["█", "", "", ""],
  ["│", "", "", ""],
]
*/
const chartS = new Array<Array<string>>(rows+1);
for(let c = 0; c < chartS.length; c++){
  chartS[c] = new Array(cols).fill(Symbols.empty);
}

function calculateRowPrice(rowNr: number){
  return (chartS.length-1 - rowNr) * priceIncrement + lowest_point;
}

const RESET = '\x1b[0m';

// TODO: make body bright green and wick normal green
function green(x: string){
  return `\x1b[32m${x}${RESET}`
}
function red(x: string){
  return `\x1b[31m${x}${RESET}`
}
function bold(x: string){
  return `\x1b[1m${x}${RESET}`
}

function bgBlue(x: string) {
  return `\x1b[44m${x}${RESET}`;
}

const cc = new ChartChecker(priceIncrement);

for(let row = 0; row < chartS.length; row++){
  const rowPrice = calculateRowPrice(row);
  for(let col = 0; col < chartS[row].length; col++){ // TODO: maybe a safer approach would be to check against data.length
    const columnOHLC = data[col];
    const colored = columnOHLC[1] > columnOHLC[4] ? red : green;
    // TODO: check if within range here to avoid re-calculating it in every method

    // TODO: split checking up between single block candlestick chekcs and multi-block ones.. (i.e., small doji == one block)
    if(cc.isStarDoji(rowPrice, columnOHLC)){ // TODO: fix typo
      chartS[row][col] = colored(Symbols.star_doji_thick);
    }else if(cc.isGraveStoneDoji(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.gravestone_doji);
    }else if (cc.isDragonFlyDoji(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.dragonfly_doji);
    }else if(cc.isNoMovement(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.no_movement);
    }else if(cc.isShortTopWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_wick_top);
    }else if(cc.isTopWick(rowPrice, columnOHLC)){
      chartS[row][col] =colored(Symbols.body_to_wick_top);
    }else if(cc.isShortBottomWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_wick_bottom);
    }else if(cc.isBottomWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.body_to_wick_bottom);
    }else if(cc.isWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.full_wick);
    }else if(cc.isShortBodyTop(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_body_top);
    }else if(cc.isShortBodyBottom(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_body_bottom);
    }else if(cc.isBody(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.full_body);
    }else if (cc.isTooGranularTop(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.too_granular_top);
    }else if(cc.isTooGranularBottom(rowPrice, columnOHLC)){
      chartS[row][col] = bgBlue(colored(Symbols.too_granular_bottom));
    }else{
      chartS[row][col] = Symbols.empty;
    }
  }
}


let chartString = "";
for(let row = 0; row < chartS.length; row++){
  const rowPrice = calculateRowPrice(row);
  const rowPriceForChart = rowPrice.toFixed(2).toString().padStart(highest_point.toString().length)
  chartString += rowPriceForChart +"├"+ chartS[row].join("") + "\n";
}

console.log(chartS.length);
console.log(`price incr(${priceIncrement}) - top(${highest_point}) - bottom(${lowest_point})`);
console.log(chartString);
// TODO: Dates, horizontally
