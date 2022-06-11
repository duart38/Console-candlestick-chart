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

export default class ChartChecker {
    constructor(public priceIncrement: number) { }

    protected bodyTop(a: number, b: number): number {
        return Math.max(a, b);
    }
    protected bodyBottom(a: number, b: number): number {
        return Math.min(a, b);
    }

    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's top wick.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isTopWick(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO: early escape if one or more conditions not met.
        const bodyTop = this.bodyTop(open, close);
        // top of body within the block but only till halfway through this block.
        const BodyHighWithinCube = bodyTop > (ppq - this.priceIncrement * 0.5) //&& bodyTop <= ppq;
        // closing of lower body needs to be BELOW this cube (i.e., not within this cube)
        const bodyLowIsBelowCube = this.bodyBottom(open, close) <= ppq - this.priceIncrement;

        return ppq > this.bodyTop(open, close) && ppq <= high && BodyHighWithinCube && bodyLowIsBelowCube;
    }

    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's bottom wick.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isBottomWick(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO: early escape if one or more conditions not met.
        const bodyBottom = this.bodyBottom(open, close);
        const bodyTop = this.bodyTop(open, close);

        // bottom of body within the block but only till halfway through this block.
        const BodyBottomWithinCube = bodyBottom >= (ppq - this.priceIncrement) && bodyBottom < (ppq + this.priceIncrement);
        const bodyTopAboveCube = bodyTop > ppq;
        const bodyHalfWayThrough = (ppq + this.priceIncrement) - bodyBottom <= (this.priceIncrement * 0.5);

        return ppq < this.bodyBottom(open, close) && ppq >= low && BodyBottomWithinCube && bodyTopAboveCube && bodyHalfWayThrough;
    }

    isWick(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO: only return true if the wick takes up a significant portion of this cube.. otherwise we branch to a different method that gives shorter wick..
        return (ppq > this.bodyTop(open, close) && ppq <= high) || (ppq < this.bodyBottom(open, close) && ppq >= low);
    }

    isShortBottomWick(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        if (low === this.bodyBottom(open, close)) return false;
        const lowIsWithinCube = low < (ppq + this.priceIncrement) && low > (ppq - this.priceIncrement)
        const wickIsHalfRange = (ppq + this.priceIncrement) - low <= this.priceIncrement * 0.5 && (ppq + this.priceIncrement) - low >= this.priceIncrement * 0.1;
        return lowIsWithinCube && wickIsHalfRange;
    }
    isShortTopWick(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        if (high === this.bodyTop(open, close)) return false;
        const highIsWithinCube = high < (ppq + this.priceIncrement) && high > (ppq - this.priceIncrement)
        const wickIsHalfRange = high - (ppq - this.priceIncrement) <= this.priceIncrement * 0.5 && high - (ppq - this.priceIncrement) >= this.priceIncrement * 0.1;
        const isTowardsBottom = (ppq + this.priceIncrement) - high > high - (ppq - this.priceIncrement);
        return highIsWithinCube && wickIsHalfRange && isTowardsBottom;
    }
    /**
     * Check if ppq falls within the range that is classified within the provided OHLC's body.
     * @param ppq price position query to check against
     * @param param1 single OHLC data
     */
    isBody(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        return ppq >= this.bodyBottom(open, close) && ppq <= this.bodyTop(open, close)
    }

    isShortBodyTop(ppq: number, [, open, high, low, close]: TOHLC): boolean { // ╻
        const bodyTop = this.bodyTop(open, close);
        const bodyBottom = this.bodyBottom(open, close);
        const distanceBodyTopAndCubeTop = (ppq + this.priceIncrement) - bodyTop;

        const atPrice = high > ppq - this.priceIncrement && high < ppq + this.priceIncrement && bodyTop < ppq + this.priceIncrement;
        const wickIsCloseToBodyTop = high - bodyTop <= this.priceIncrement * 0.1;
        const bodyTopIsHalf = distanceBodyTopAndCubeTop > this.priceIncrement * 0.2 && distanceBodyTopAndCubeTop <= this.priceIncrement * 0.5;
        // check if the bottom is below this cube or very very near to the cube
        const bodyBottomIsBelowOrNearCube = bodyBottom <= ppq - this.priceIncrement * 0.1;

        return atPrice && wickIsCloseToBodyTop && bodyTopIsHalf && bodyBottomIsBelowOrNearCube;
    }

    isShortBodyBottom(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO.. can only occur if the wick is within 0.1 percent distance from the body at the bottom meaning we dont show it.
        // ofc top needs to be within the cube and take about 50% of the cube or less (>= 10%)
        // +1: see above for the opposite.

        const bodyTop = this.bodyTop(open, close);
        const bodyBottom = this.bodyBottom(open, close);
        const distanceBodyBottomAndCubeBottom = bodyBottom - (ppq - this.priceIncrement);

        const atPrice = low > ppq - this.priceIncrement && low < ppq + this.priceIncrement && bodyBottom < ppq + this.priceIncrement;
        const wickIsCloseToBodyBottom = bodyBottom - low <= this.priceIncrement * 0.1;
        const bodyBottomIsHalf = distanceBodyBottomAndCubeBottom > this.priceIncrement * 0.2 && distanceBodyBottomAndCubeBottom <= this.priceIncrement * 0.5;
        // check if the bottom is below this cube or very very near to the cube
        const bodyTopIsAboveOrNearCube = bodyTop >= ppq + this.priceIncrement * 0.1;

        return atPrice && wickIsCloseToBodyBottom && bodyBottomIsHalf && bodyTopIsAboveOrNearCube;
    }

    isNoMovement(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        const atPrice = low > ppq - this.priceIncrement && high < ppq + this.priceIncrement;
        return atPrice && open == close && high == low;
    }

    isTooGranularTop(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO: top(▔), bottom(▁), middle(━) granularity
        const atPrice = low > ppq - this.priceIncrement && high < ppq + this.priceIncrement;

        // is it only going to take up one cube??
        const candleTooGranular = high - low > 0 && high - low < this.priceIncrement * 0.1;
        const closerToTop = (ppq + this.priceIncrement) - high < low - (ppq - this.priceIncrement);

        return atPrice && candleTooGranular && closerToTop;
    }
    // TODO: one of these does not work.. theres one of each on top on one another.. maybe only work with bodies?
    isTooGranularBottom(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        // TODO: top(▔), bottom(▁), middle(━) granularity
        const atPrice = low > ppq - this.priceIncrement && high < ppq + this.priceIncrement;

        // is it only going to take up one cube??
        const candleTooGranular = high - low > 0 && high - low < this.priceIncrement * 0.1;
        const closerToBottom = low - (ppq - this.priceIncrement) < (ppq + this.priceIncrement) - high;

        return atPrice && candleTooGranular && closerToBottom;
    }


    isStarDoji(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        const bodyHigh = this.bodyTop(open, close);
        const bodyLow = this.bodyBottom(open, close);
        // TODO: can we pre-calculate the this.priceIncrement percentages that are used allot to improve performance? (i.e., this.priceIncrement*0.2)
        // is the body roughly within the middle of our block?
        const isBodyWithin = bodyLow > (ppq - this.priceIncrement * 0.3) && bodyHigh < (ppq + this.priceIncrement * 0.3);
        // body needs to be above a certain size to prevent false stars when there is no movement.
        const isStarBody = bodyHigh - bodyLow >= this.priceIncrement * 0.2;
        return isBodyWithin && isStarBody;
    }

    isGraveStoneDoji(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        const atPrice = (ppq >= this.bodyBottom(open, close) && ppq <= this.bodyTop(open, close));
        // opening and closing is happening within one cube
        const openCloseWithinOneCube = Math.abs(open - close) < this.priceIncrement; // TODO: is this correct?
        // are we at the lower bound? used to put the gravestone base(┷)...
        const lowerBounded = this.bodyBottom(open, close) - low < this.priceIncrement / 3;
        // top wick needs to be larger than bottom wick
        const topWickLarger = high - this.bodyTop(open, close) > this.bodyBottom(open, close) - low;

        return atPrice && openCloseWithinOneCube && lowerBounded && topWickLarger;
    }

    // TODO: the dragonfly char is not really conforming to the dragonfly standard.. maybe rename but also make the check differently
    isDragonFlyDoji(ppq: number, [, open, high, low, close]: TOHLC): boolean {
        const atPrice = (ppq >= this.bodyBottom(open, close) && ppq <= this.bodyTop(open, close));
        const bodyTop = this.bodyTop(open, close);
        const bodyBottom = this.bodyBottom(open, close);
        // opening and closing is happening within one cube
        const openCloseWithinOneCube = bodyBottom > (ppq - this.priceIncrement) && bodyTop < (ppq + this.priceIncrement);
        // high is within this cube aswel
        const highWithinCube = high < (ppq + this.priceIncrement) && high > (ppq - this.priceIncrement);
        // are we at the upper bound? used to put the dragonfly base(┷)...
        // const upperBounded = high - this.bodyBottom(open, close) < this.priceIncrement/3;
        // const upperBounded = (ppq + this.priceIncrement) - bodyBottom < this.priceIncrement*0.5;
        const upperBounded = (ppq + this.priceIncrement) - bodyTop <= this.priceIncrement * 0.2;

        // bottom wick needs to be larger than top wick
        const bottomWickLarger = bodyBottom - low > high - bodyTop;

        return atPrice && openCloseWithinOneCube && upperBounded && bottomWickLarger && highWithinCube;
    }
}

