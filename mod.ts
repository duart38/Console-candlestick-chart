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

  private chartS: Array<Array<string>> = [];
  private sizeChangeCbs: SIGWINCH_CB[] = [];
  private beforeRenderCbs: (()=>void)[] = [];

  // TODO: options to pass in custom Symbols etc
  constructor(private data: Array<TOHLC>, private options = ChartOptions) {
    this._reCalc();
    this._registerSIGWINCHEvent();
  }

  private getLeftPadding(){
    return this.highest_point.toFixed(2).length;
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
    if(this.beforeRenderCbs.length>0) for(const cb of this.beforeRenderCbs) cb();

    this.lowest_point = this.data.reduce((prev, curr) => curr[3] < prev ? curr[3] : prev, Infinity);
    this.highest_point = this.data.reduce((prev, curr) => curr[2] > prev ? curr[2] : prev, 0);

    const cs = Deno.consoleSize(Deno.stdout.rid);
    // TODO: check if deno is not available.. default to other thing
    this.rows = cs.rows - this.getVerticalPadding();
    this.priceIncrement = ((this.highest_point + 1) - (this.lowest_point - 1)) / (this.rows);

    this.cols =  this.data.length < cs.columns 
      ? this.data.length 
      :cs.columns - this.getLeftPadding() - 1; //data.length;

    const cc = new ChartChecker(this.priceIncrement);

    this.chartS = new Array(this.rows + 1);
    for (let c = 0; c < this.chartS.length; c++) {
      this.chartS[c] = new Array(this.cols).fill(Symbols.empty);
    }



    for (let row = 0; row < this.chartS.length; row++) {
      const rowPrice = this.calculateRowPrice(row);
      for (let col = 0; col < this.chartS[row].length; col++) {
        const columnOHLC = this.data[col];
        if(columnOHLC === undefined){
          this.chartS[row][col] = Symbols.empty;
          continue;
        }
        const colored = columnOHLC[1] > columnOHLC[4] ? Color.red :Color. green;

        // TODO: split checking up between single block candlestick chekcs and multi-block ones.. (i.e., small doji == one block)
        if (cc.isNoMovement(rowPrice, columnOHLC)) {
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
          this.chartS[row][col] =  colored(Symbols.full_wick);
        } else if (cc.isShortBodyTop(rowPrice, columnOHLC)) {
          if(cc.isShortTopWick(cc.cubeTop(rowPrice), columnOHLC)){
            this.chartS[row][col] = colored(Symbols.body_to_wick_top);
          }else{
            this.chartS[row][col] = colored(Symbols.half_body_top);
          }
        } else if (cc.isShortBodyBottom(rowPrice, columnOHLC)) {
          if(cc.isShortBottomWick(cc.cubeBottom(rowPrice), columnOHLC)){
            this.chartS[row][col] = colored(Symbols.body_to_wick_bottom);
          }else{
            this.chartS[row][col] = colored(Symbols.half_body_bottom);
          }
        } else if (cc.isBody(rowPrice, columnOHLC)) {
          this.chartS[row][col] = colored(Symbols.full_body);
        } else if(cc.isContainedWithinCube(rowPrice, columnOHLC)){
          // the leftovers which have data but was not captured.
          // TODO: setting to color unclassified separately?
          this.chartS[row][col] = colored(Symbols.un_classified);
        }
        else {
          this.chartS[row][col] = Symbols.empty;
        }
      }
    }
  }

  private calculateRowPrice(rowNr: number) {
    return (this.chartS.length - 1 - rowNr) * this.priceIncrement + this.lowest_point;
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


  public toString = () : string => {
    return this.render();
  }

}
