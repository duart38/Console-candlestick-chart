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
import { Symbols } from "./utils/Symbols.ts";


type OHLCArray = Array<TOHLC>;
const data: OHLCArray = ((await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=eur&days=1")
                          .then(x=>x.json())) as OHLCArray)
                          .slice(-(Deno.consoleSize(Deno.stdout.rid).columns-10)) // TODO: 10 is too static.. figure something out
                          
// Dumping for testing
Deno.writeTextFileSync("DUMP.json", JSON.stringify(data));


/**
 * Check if ppq falls within the range that is classified within the provided OHLC's top wick.
 * @param ppq price position query to check against
 * @param param1 single OHLC data
 */
function isTopWick(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  // TODO: early escape if one or more conditions not met.
  const bodyTop = Math.max(open, close);
  // top of body within the block but only till halfway through this block.
  const BodyHighWithinCube = bodyTop > (ppq - priceIncrement*0.5) //&& bodyTop <= ppq;
  // closing of lower body needs to be BELOW this cube (i.e., not within this cube)
  const bodyLowIsBelowCube = Math.min(open, close) <= ppq - priceIncrement;

  return ppq > Math.max(open, close) && ppq <= high && BodyHighWithinCube && bodyLowIsBelowCube;
}

/**
 * Check if ppq falls within the range that is classified within the provided OHLC's bottom wick.
 * @param ppq price position query to check against
 * @param param1 single OHLC data
 */
 function isBottomWick(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  // TODO: early escape if one or more conditions not met.
  const bodyBottom = Math.min(open, close);
  const bodyTop = Math.max(open, close);

  // bottom of body within the block but only till halfway through this block.
  const BodyBottomWithinCube = bodyBottom >= (ppq - priceIncrement) && bodyBottom < (ppq + priceIncrement);
  const bodyTopAboveCube = bodyTop > ppq;
  const bodyHalfWayThrough = (ppq+priceIncrement) - bodyBottom <= (priceIncrement*0.5)

  return ppq < Math.min(open, close) && ppq >= low && BodyBottomWithinCube && bodyTopAboveCube && bodyHalfWayThrough;
}

function isWick(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  // TODO: only return true if the wick takes up a significant portion of this cube.. otherwise we branch to a different method that gives shorter wick..
  return (ppq > Math.max(open, close) && ppq <= high) || (ppq < Math.min(open, close) && ppq >= low);
}

function isShortBottomWick(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  if(low === Math.min(open, close)) return false;
  const lowIsWithinCube = low < (ppq+priceIncrement) && low > (ppq-priceIncrement)
  const wickIsHalfRange = (ppq+priceIncrement) - low <= priceIncrement*0.5 && (ppq+priceIncrement) - low >= priceIncrement*0.1;
  return lowIsWithinCube && wickIsHalfRange;
}
function isShortTopWick(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  if(high === Math.max(open, close)) return false;
  const highIsWithinCube = high < (ppq+priceIncrement) && high > (ppq-priceIncrement)
  const wickIsHalfRange = high - (ppq-priceIncrement) <= priceIncrement*0.5 && high - (ppq-priceIncrement) >= priceIncrement*0.1;
  return highIsWithinCube && wickIsHalfRange;
}
/**
 * Check if ppq falls within the range that is classified within the provided OHLC's body.
 * @param ppq price position query to check against
 * @param param1 single OHLC data
 */
 function isBody(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  return ppq >= Math.min(open, close) && ppq <= Math.max(open, close)
}

function isShortBodyTop(){ // ╻
  // TODO.. can only occur if the wick is within 0.1 percent distance from the body at the top meaning we dont show it.
  // ofc top needs to be within the cube and take about 50% of the cube or less (>= 10%)
}

function isShortBodyBottom(){
  // TODO.. can only occur if the wick is within 0.1 percent distance from the body at the bottom meaning we dont show it.
  // ofc top needs to be within the cube and take about 50% of the cube or less (>= 10%)
  // +1: see above for the opposite.
}

function isNoMovement(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  const atPrice = low > ppq-priceIncrement && high < ppq+priceIncrement;
  return atPrice && open == close && high == low;
}

function isTooGranular(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  // TODO: make 3 versions, one with sticks long, sticks short and one that is just a block? 
  const atPrice = low > ppq-priceIncrement && high < ppq+priceIncrement;
  // is it only going to take up one cube??
  // const willTakeOnlyOneCube = high - low <= priceIncrement;
  const candleTooGranular = high - low > 0 && high - low < priceIncrement*0.1
  return atPrice /* && willTakeOnlyOneCube */ && candleTooGranular;
}


function isStarDoji(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  // TODO: can we pre-calculate the priceIncrement percentages that are used allot to improve performance? (i.e., priceIncrement*0.2)
  // is the body roughly within the middle of our block?
  const isBodyWithin = bodyLow > (ppq - priceIncrement*0.3) && bodyHigh < (ppq + priceIncrement*0.3);
  // body needs to be above a certain size to prevent false stars when there is no movement.
  const isStarBody = bodyHigh - bodyLow >= priceIncrement*0.2;
  return isBodyWithin && isStarBody;
}

function isGraveStoneDoji(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  const atPrice = (ppq >= Math.min(open, close) && ppq <= Math.max(open, close));
  // opening and closing is happening within one cube
  const openCloseWithinOneCube = Math.abs(open - close) < priceIncrement; // TODO: is this correct?
  // are we at the lower bound? used to put the gravestone base(┷)...
  const lowerBounded = Math.min(open, close) - low < priceIncrement/3;
  // top wick needs to be larger than bottom wick
  const topWickLarger = high - Math.max(open, close) > Math.min(open, close) - low;

  if(atPrice && openCloseWithinOneCube && lowerBounded && topWickLarger) console.log("GRAVESTONE DOJI!!")
  return atPrice && openCloseWithinOneCube && lowerBounded && topWickLarger;
}

// TODO: the dragonfly char is not really conforming to the dragonfly standard.. maybe rename but also make the check differently
function isDragonFlyDoji(ppq: number, [,open,high,low,close]: TOHLC): boolean {
  const atPrice = (ppq >= Math.min(open, close) && ppq <= Math.max(open, close));
  const bodyTop = Math.max(open, close);
  const bodyBottom = Math.min(open, close);
  // opening and closing is happening within one cube
  const openCloseWithinOneCube = bodyBottom > (ppq-priceIncrement) && bodyTop < (ppq+priceIncrement);
  // high is within this cube aswel
  const highWithinCube = high < (ppq+priceIncrement) && high > (ppq-priceIncrement);
  // are we at the upper bound? used to put the dragonfly base(┷)...
  // const upperBounded = high - Math.min(open, close) < priceIncrement/3;
  // const upperBounded = (ppq + priceIncrement) - bodyBottom < priceIncrement*0.5;
  const upperBounded = (ppq + priceIncrement) - bodyTop <= priceIncrement*0.2;

  // bottom wick needs to be larger than top wick
  const bottomWickLarger = bodyBottom - low  > high - bodyTop;

  return atPrice && openCloseWithinOneCube && upperBounded && bottomWickLarger && highWithinCube;
}


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

for(let row = 0; row < chartS.length; row++){
  const rowPrice = calculateRowPrice(row);
  for(let col = 0; col < chartS[row].length; col++){ // TODO: maybe a safer approach would be to check against data.length
    const columnOHLC = data[col];
    const colored = columnOHLC[1] > columnOHLC[4] ? red : green;

    // TODO: split checking up between single block candlestick chekcs and multi-block ones.. (i.e., small doji == one block)
    if(isStarDoji(rowPrice, columnOHLC)){ // TODO: fix typo
      chartS[row][col] = colored(Symbols.star_doji_thick);
    }else if(isGraveStoneDoji(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.gravestone_doji);
    }else if (isDragonFlyDoji(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.dragonfly_doji);
    }else if(isNoMovement(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.no_movement);
    }else if(isShortTopWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_wick_top);
    }else if(isTopWick(rowPrice, columnOHLC)){
      chartS[row][col] =colored(Symbols.body_to_wick_top);
    }else if(isShortBottomWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.half_wick_bottom);
    }else if(isBottomWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.body_to_wick_bottom);
    }else if(isWick(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.full_wick);
    }else if(isBody(rowPrice, columnOHLC)){
      chartS[row][col] = colored(Symbols.full_body);
    }else if (isTooGranular(rowPrice, columnOHLC)){
      chartS[row][col] = bgBlue(colored(Symbols.too_granular));
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
