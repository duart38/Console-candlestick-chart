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

import { Candle } from "./components/Candle.ts";
import { TOHLC } from "./interfaces/OHLC.ts";
import { Color } from "./utils/ANSI.ts";
import ChartChecker from "./utils/ChartCheckers.ts";
import { Symbols } from "./utils/Symbols.ts";


export type SIGWINCH_CB = (newSize: {rows: number, cols: number})=>void;
export type TChartOptions = {
  listenForSIGWINCH: boolean,

  // changeInternalSizeOnSigwinch: boolean,
  /**
   * Indicates if the logic should change trigger an internal render when the size of the console changes.
   * Triggering a render will change the internal rows/column variables.
   * > Does NOT do anything unless listenForSIGWINCH is set to true
   */
  renderOnSIGWINCH: boolean

  // TODO: bullish color
  // TODO: bearish color
  // TODO: bg color
  // TODO: manual row and column sizing
  // TODO: different symbols
}
export const ChartOptions: TChartOptions = {
  listenForSIGWINCH: true,
  renderOnSIGWINCH: true
}

export class Chart {
  public lowest_point = 0;
  public highest_point = 0;
  public priceIncrement = 0;

  private rows = 0;
  private cols = 0;

  private sizeChangeCbs: SIGWINCH_CB[] = [];
  private beforeRenderCbs: (()=>void)[] = [];

  public data: Array<Candle>;
  private slicedData: Array<Candle>;

  // TODO: options to pass in custom Symbols etc
  constructor(data: Array<TOHLC>, private options = ChartOptions) {
    this.data = data.map(_=>new Candle(_));
    this.slicedData = this.data;
    this._reCalc();
    this._registerSIGWINCHEvent();
  }

  private getLeftPadding(){
    return this.highest_point.toFixed(2).toString().padStart(this.highest_point.toString().length).length + 2;
  }
  private getVerticalPadding(){
    return 5; // TODO: figure this one out
  }

  private _registerSIGWINCHEvent() {
    if(this.options.listenForSIGWINCH === false) return;
    Deno.addSignalListener("SIGWINCH", ()=>{
      let {rows, columns} = Deno.consoleSize(Deno.stdout.rid)//.rows - 5
      rows -= this.getVerticalPadding();
      columns -= this.getLeftPadding();

      if(this.options.renderOnSIGWINCH){
        this._reCalc();
      }

      // TODO: auto-render?
      // TODO: make changing of rows and cols optional?
      
      if(this.sizeChangeCbs.length === 0) return;
      for(const cb of this.sizeChangeCbs) cb({rows, cols: columns})
    });
    setInterval(()=>{}, 10^10)
  }

  private _reCalc(){

    // TODO: check if deno is not available.. default to other thing
    const cs = Deno.consoleSize(Deno.stdout.rid);
    // cut up data to only show newest items based on the width of the console.
    this.slicedData = this.data.slice(-(cs.columns) - this.getLeftPadding());

    this.lowest_point = this.slicedData.reduce((prev, curr) => curr.low < prev ? curr.low : prev, Infinity);
    this.highest_point = this.slicedData.reduce((prev, curr) => curr.high > prev ? curr.high : prev, 0);


    const prevRows = this.rows;
    this.rows = cs.rows - this.getVerticalPadding();
    this.priceIncrement = ((this.highest_point + 1) - (this.lowest_point - 1)) / (this.rows);
    // check and resize array if required. clear if not.
    if(this.rows !== prevRows) this.slicedData.forEach((c)=>c.resizeSegmentList(this.rows));
    else this.slicedData.forEach(c=>c.clearSegments());

    this.cols =  this.slicedData.length < cs.columns
      ? this.slicedData.length 
      : cs.columns - this.getLeftPadding()

    const cc = new ChartChecker(this.priceIncrement);


    for (let row = 0; row < this.rows+1; row++) {
      const rowPrice = this.calculateRowPrice(row);
      for (let col = 0; col < this.cols; col++) {
        const currentCandle = this.slicedData[col];
        if(currentCandle === undefined || currentCandle.isValid() === false){
          currentCandle.segments[row] = Symbols.empty;
          continue;
        }
        const colored = currentCandle.isBearish() ? Color.red :Color.green;

        // TODO: split checking up between single block candlestick chekcs and multi-block ones.. (i.e., small doji == one block)
        if (cc.isNoMovement(rowPrice, currentCandle)) {
          // this.chartS[row][col] _= colored(Symbols.no_movement);
          currentCandle.segments[row] = colored(Symbols.no_movement);
        } else if (cc.isShortTopWick(rowPrice, currentCandle)) {
          currentCandle.segments[row] = colored(Symbols.half_wick_top);
        } else if (cc.isTopWick(rowPrice, currentCandle)) {
          currentCandle.segments[row] = colored(Symbols.body_to_wick_top);
        } else if (cc.isShortBottomWick(rowPrice, currentCandle)) {
          currentCandle.segments[row] = colored(Symbols.half_wick_bottom);
        } else if (cc.isBottomWick(rowPrice, currentCandle)) {
          currentCandle.segments[row] = colored(Symbols.body_to_wick_bottom);
        } else if (cc.isWick(rowPrice, currentCandle)) {
          currentCandle.segments[row] =  colored(Symbols.full_wick);
        } else if (cc.isShortBodyTop(rowPrice, currentCandle)) {
          if(cc.isShortTopWick(cc.cubeTop(rowPrice), currentCandle)){
            currentCandle.segments[row] = colored(Symbols.body_to_wick_top);
          }else{
            currentCandle.segments[row] = colored(Symbols.half_body_top);
          }
        } else if (cc.isShortBodyBottom(rowPrice, currentCandle)) {
          if(cc.isShortBottomWick(cc.cubeBottom(rowPrice), currentCandle)){
            currentCandle.segments[row] = colored(Symbols.body_to_wick_bottom);
          }else{
            currentCandle.segments[row] = colored(Symbols.half_body_bottom);
          }
        } else if (cc.isBody(rowPrice, currentCandle)) {
          currentCandle.segments[row] = colored(Symbols.full_body);
        } else if(cc.isContainedWithinCube(rowPrice, currentCandle)){
          // the leftovers which have data but was not captured.
          // TODO: setting to color unclassified separately?
          currentCandle.segments[row] = colored(Symbols.un_classified);
        }
        else {
          currentCandle.segments[row] = Symbols.empty;
        }
      }
    }
  }

  private calculateRowPrice(rowNr: number) {
    return (this.rows - rowNr) * this.priceIncrement + this.lowest_point;
  }

  /**
   * Returns the currently (last) stored rows and columns for this chart.
   * > NOTE: is not guaranteed to be the actual size of the console.
   */
  public chartSize(){
    return {
      rows: this.rows,
      cols: this.cols
    }
  }

  public onConsoleSizeChange(cb: SIGWINCH_CB){
    this.sizeChangeCbs.push(cb);
  }

  /**
   * Called before the chart is internally rendered. Can, for example, be used to modify the data beforehand
   */
  public onBeforeRender(cb: ()=>void){
    this.beforeRenderCbs.push(cb);
  }

  /**
   * Returns a string representation of the chart to be used with console.log()
   * @param reCalculate set to true if the chart needs to be re-calculated and re-drawn before.
   */
  public render(reCalculate = false) {
    // TODO: pricing on the left seems to be incorrect.. please check
    if(reCalculate) this._reCalc();
    if(this.beforeRenderCbs.length>0) for(const cb of this.beforeRenderCbs) cb();
    let chartString = "";
    // `price incr(${priceIncrement}) - top(${highest_point}) - bottom(${lowest_point})`
    // TODO: Dates, horizontally

    for(let row = 0; row < this.rows+1; row++){
      const rowPrice = this.calculateRowPrice(row);
      const rowPriceForChart = rowPrice.toFixed(2).toString().padStart(this.highest_point.toString().length);
      chartString += rowPriceForChart + "???"
      for(let col = 0; col < this.cols; col++){
        const candle = this.slicedData[col];
        chartString += candle.segments[row] //+ "\n";
      }
      chartString += "\n"
    }
    return chartString;
  }


  /**
   * Returns a list of the candles, in order, that can be seen on screen (off-screen candles are not included)
   */
  public getActiveCandles(){
    return this.slicedData;
  }

  public toString = () : string => {
    return this.render();
  }

}
