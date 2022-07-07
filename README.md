# Render candlestick charts within your terminal
> This is still work in progress. There's quite some issues with some missing candles due to lack of checks for some small granular candles. Performance can also significantly be improved.

- Adjusts based on terminal width and height automatically
- Customizable symbols
- Ability to change candle color (e.g., when a pattern is to be displayed in the terminal)

<img src="https://github.com/duart38/Console-candlestick-chart/raw/0.0.1/showcase1.png" />

## Example usage
```TypeScript
const data:  Array<TOHLC> = [...] // your data here
const chart = new Chart(data);

// (COMMENTED) example of how to apply an effect to a candle.
// chart.getActiveCandles()[3].addEffect(Color.bgBlue);

// rendering of the terminal
console.log(chart+"");

// executes callback when terminal size changes
chart.onConsoleSizeChange((e)=>{
    // clear the terminal
    Deno.stdout.write(new TextEncoder().encode(`\x1B[2J`));
    // re-print the chart
    console.log(""+chart);
});
```