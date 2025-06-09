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
