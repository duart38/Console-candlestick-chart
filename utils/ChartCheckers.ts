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

import { Candle } from "../components/Candle.ts";
import { TOHLC } from "../interfaces/OHLC.ts";

export default class ChartChecker {
    constructor(public priceIncrement: number) { }

    protected bodyTop(a: number, b: number): number {
        return Math.max(a, b);
    }
    protected bodyBottom(a: number, b: number): number {
        return Math.min(a, b);
    }
    public cubeTop(ppq: number){
        return ppq + this.priceIncrement;
    }
    public cubeBottom(ppq: number){
        return ppq - this.priceIncrement;
    }
    public hasDataWithinCube(ppq: number, {low, high, open, close}: Candle){
        return (
            (low > this.cubeBottom(ppq) && low < this.cubeTop(ppq)) ||
            (high > this.cubeBottom(ppq) && high < this.cubeTop(ppq)) ||
            (open > this.cubeBottom(ppq) && open < this.cubeTop(ppq)) ||
            (close > this.cubeBottom(ppq) && close < this.cubeTop(ppq))
        );
    }
    public isContainedWithinCube(ppq: number, {high, low}: Candle){
        return (
            low > this.cubeBottom(ppq) && low < this.cubeTop(ppq) &&
            high > this.cubeBottom(ppq) && high < this.cubeTop(ppq)
        );
    }
    public isRequestedWithinCube(ppq: number, request: number){
        return request >= this.cubeBottom(ppq) && request <= this.cubeTop(ppq);
    }

    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's top wick.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isTopWick(ppq: number, candle: Candle): boolean {
        // TODO: early escape if one or more conditions not met.
        const bodyTop = this.bodyTop(candle.open, candle.close);
        // top of body within the block
        const BodyHighWithinCube = bodyTop > this.cubeBottom(ppq) && bodyTop <= this.cubeTop(ppq);
        // ensure a little bit of body
        const bodyHighHalfWayThrough = this.cubeTop(ppq) - bodyTop >= this.priceIncrement*0.2;
        // closing of lower body needs to be BELOW this cube (i.e., not within this cube)
        const bodyLowIsBelowCube = this.bodyBottom(candle.open, candle.close) <= ppq;

        return ppq > bodyTop && ppq <= candle.high && BodyHighWithinCube && bodyLowIsBelowCube && bodyHighHalfWayThrough;
    }

    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's bottom wick.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isBottomWick(ppq: number, {open, low, close}: Candle): boolean {
        // TODO: early escape if one or more conditions not met.
        const bodyBottom = this.bodyBottom(open, close);
        const bodyTop = this.bodyTop(open, close);

        // bottom of body within the block but only till halfway through this block.
        const BodyBottomWithinCube = bodyBottom >= (this.cubeBottom(ppq)) && bodyBottom < (this.cubeTop(ppq));
        const bodyTopAboveCube = bodyTop > ppq;
        const bodyHalfWayThrough = (this.cubeTop(ppq)) - bodyBottom <= (this.priceIncrement * 0.8);

        return ppq < bodyBottom && ppq >= low && BodyBottomWithinCube && bodyTopAboveCube && bodyHalfWayThrough;
    }

    isWick(ppq: number, {open, high, low, close}: Candle): boolean {
        // TODO: only return true if the wick takes up a significant portion of this cube.. otherwise we branch to a different method that gives shorter wick..
        // contains body.. not wick.
        return (ppq > this.bodyTop(open, close) && ppq <= high) || (ppq < this.bodyBottom(open, close) && ppq >= low);
    }

    isShortBottomWick(ppq: number, {open, low, close}: Candle): boolean {
        if (low === this.bodyBottom(open, close)) return false;
        const lowIsWithinCube = this.isRequestedWithinCube(ppq, low);
        const wickIsHalfRange = (this.cubeTop(ppq)) - low <= this.priceIncrement * 0.5;
        return lowIsWithinCube && wickIsHalfRange;
    }

    isShortTopWick(ppq: number, {open, high, close}: Candle): boolean {
        if (high === this.bodyTop(open, close)) return false;
        const highIsWithinCube = this.isRequestedWithinCube(ppq, high);
        const wickIsHalfRange = high - (this.cubeBottom(ppq)) <= this.priceIncrement * 0.7;
        const isTowardsBottom = (this.cubeTop(ppq)) - high > high - (this.cubeBottom(ppq));
        return highIsWithinCube && wickIsHalfRange && isTowardsBottom;
    }
    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's body.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isBody(ppq: number, {open, close}: Candle): boolean {
        return ppq >= this.bodyBottom(open, close) && ppq <= this.bodyTop(open, close)
    }

    isShortBodyTop(ppq: number, {open, high, close}: Candle): boolean { // ╻
        const bodyTop = this.bodyTop(open, close);
        const bodyBottom = this.bodyBottom(open, close);
        const distanceBodyTopAndCubeTop = (this.cubeTop(ppq)) - bodyTop;

        const atPrice = this.isRequestedWithinCube(ppq, high) && bodyTop < this.cubeTop(ppq);
        const wickIsCloseToBodyTop = high - bodyTop <= this.priceIncrement * 0.1;
        const bodyTopIsHalf = distanceBodyTopAndCubeTop >= this.priceIncrement * 0.2 && distanceBodyTopAndCubeTop <= this.priceIncrement * 0.9;
        // check if the bottom is below this cube or very very near to the cube
        const bodyBottomIsBelowOrNearCube = bodyBottom <= ppq;

        return atPrice && wickIsCloseToBodyTop && bodyTopIsHalf && bodyBottomIsBelowOrNearCube;
    }

    isShortBodyBottom(ppq: number, {open, low, close}: Candle): boolean {
        // TODO.. can only occur if the wick is within 0.1 percent distance from the body at the bottom meaning we dont show it.
        // ofc top needs to be within the cube and take about 50% of the cube or less (>= 10%)
        // +1: see above for the opposite.

        const bodyTop = this.bodyTop(open, close);
        const bodyBottom = this.bodyBottom(open, close);
        const distanceBodyBottomAndCubeBottom = bodyBottom - (this.cubeBottom(ppq));

        const atPrice = low > this.cubeBottom(ppq) && low < this.cubeTop(ppq) && bodyBottom < this.cubeTop(ppq);
        const wickIsCloseToBodyBottom = bodyBottom - low <= this.priceIncrement * 0.1;
        const cubeBelowHasNoWick = low > this.cubeBottom(ppq);
        const bodyBottomIsHalf = distanceBodyBottomAndCubeBottom > this.priceIncrement * 0.2 && distanceBodyBottomAndCubeBottom <= this.priceIncrement * 0.9;
        // check if the bottom is below this cube or very very near to the cube
        const bodyTopIsAboveOrNearCube = bodyTop >= ppq;

        return atPrice && cubeBelowHasNoWick && wickIsCloseToBodyBottom && bodyBottomIsHalf && bodyTopIsAboveOrNearCube;
    }

    isNoMovement(ppq: number, candle: Candle): boolean {
        return this.hasDataWithinCube(ppq, candle) && candle.open == candle.close && candle.high == candle.low;
    }

}

