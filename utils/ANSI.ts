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
const RESET = '\x1b[0m';

export abstract class Color {

    static green(x: string) {
        return `\x1b[32m${x}${RESET}`
    }

    static red(x: string) {
        return `\x1b[31m${x}${RESET}`
    }

    static bold(x: string) {
        return `\x1b[1m${x}${RESET}`
    }

    static bgBlue(x: string) {
        return `\x1b[44m${x}${RESET}`;
    }
}