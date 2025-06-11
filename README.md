# igaming-odds-mcp

An MCP server that gives an AI assistant a set of exact, deterministic betting-odds tools: format conversions, bookmaker margin, parlay pricing, bet settlement, and Kelly staking. All the money math is integer-cents and floor-rounded, the same discipline a real settlement ledger uses.

It pairs with a companion project, bet-settlement-service, which settles bets on a double-entry ledger.

## Tools it exposes

convert_odds converts a price between decimal, fractional, American and implied probability. bookmaker_margin works out the overround of a market and the fair odds once the margin is stripped out. parlay_odds combines several legs into one accumulator price. settle_single returns the return and profit in integer cents for a single bet. settle_accumulator settles a multi-leg accumulator, where any losing leg loses the whole bet and void legs drop to 1. settle_each_way settles an each-way bet, win and place parts separately. kelly_stake works out a Kelly-criterion stake for a given edge; a negative edge just recommends no stake at all.

Every input goes through a strict Zod schema, so bad odds (a decimal at or below 1, a probability outside 0 to 1, American at 0) come back as a readable tool error instead of a crash.

## Install

```bash
pnpm install
pnpm build
pnpm test      # 22 tests: pure math + a real MCP handshake over stdio
```

## Using it from Claude Desktop

Add this to claude_desktop_config.json (on macOS that's ~/Library/Application Support/Claude/claude_desktop_config.json):

```json
{
  "mcpServers": {
    "igaming-odds": {
      "command": "node",
      "args": ["/absolute/path/to/igaming-odds-mcp/dist/index.js"]
    }
  }
}
```

Then just ask things like "convert 3/2 to American odds", "what's the margin on a 1.90 / 1.90 market", or "Kelly stake for decimal 2.0 at a true 60% with a $1000 bankroll" and it calls the tools instead of guessing at the math.

## Example

Calling bookmaker_margin with decimalOdds [1.9, 1.9] returns:

```json
{
  "overround": 1.052632,
  "marginPct": 5.2632,
  "fairDecimalOdds": [2, 2],
  "fairProbabilities": [0.5, 0.5]
}
```

## A couple of implementation notes

All the logic is pure functions in src/odds.ts; the tool layer only validates input and formats output. Money stays as integer cents and rounding always favors the house, which is asserted in the tests, matching the rule a real settlement engine would follow. Odds convert to exact fractions through a bounded continued-fraction approximation, so something like 1.3333 round-trips to 1/3 instead of some ugly exact decimal.
