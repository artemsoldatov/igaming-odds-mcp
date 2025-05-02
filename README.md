# igaming-odds-mcp

An MCP server that gives an AI assistant a set of exact, deterministic betting-odds tools: format conversions, bookmaker margin, parlay pricing, bet settlement, and Kelly staking. All the money math is integer-cents and floor-rounded, the same discipline a real settlement ledger uses.

It pairs with a companion project, bet-settlement-service, which settles bets on a double-entry ledger.
