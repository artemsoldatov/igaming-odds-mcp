import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  bookmakerMargin,
  kelly,
  normalize,
  parlayDecimal,
  settleAccumulator,
  settleEachWay,
  settleSingle,
} from './odds.js';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

// wraps a pure computation: pretty-prints the result, turns thrown validation
// errors into a tool error the model can read
function run(fn: () => unknown): ToolResult {
  try {
    return { content: [{ type: 'text', text: JSON.stringify(fn(), null, 2) }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    };
  }
}

const decimalOdds = z.number().gt(1).describe('Decimal odds, e.g. 2.5');
const result = z.enum(['win', 'lose', 'push', 'void']);

export function registerTools(server: McpServer): void {
  server.tool(
    'convert_odds',
    'Convert a price between decimal, fractional, American and implied probability.',
    {
      odds: z.union([z.number(), z.string()]).describe('The odds value, e.g. 2.5 or "3/2"'),
      format: z.enum(['decimal', 'fractional', 'american', 'probability']),
    },
    ({ odds, format }) => run(() => normalize(odds, format)),
  );

  server.tool(
    'bookmaker_margin',
    'Compute the overround/margin of a market and the fair odds with it removed.',
    { decimalOdds: z.array(decimalOdds).min(2).describe('Decimal odds for every outcome') },
    ({ decimalOdds: odds }) => run(() => bookmakerMargin(odds)),
  );

  server.tool(
    'parlay_odds',
    'Combine several legs into one accumulator price.',
    { legs: z.array(decimalOdds).min(1).describe('Decimal odds per leg') },
    ({ legs }) => run(() => parlayDecimal(legs)),
  );

  server.tool(
    'settle_single',
    'Return and profit in integer cents for a single bet (floor rounding).',
    {
      stakeCents: z.number().int().positive(),
      decimalOdds,
      result,
    },
    ({ stakeCents, decimalOdds: odds, result: r }) => run(() => settleSingle(stakeCents, odds, r)),
  );

  server.tool(
    'settle_accumulator',
    'Settle a multi-leg accumulator; any losing leg loses the bet, void legs drop to 1.',
    {
      stakeCents: z.number().int().positive(),
      legs: z.array(z.object({ decimal: decimalOdds, result })).min(1),
    },
    ({ stakeCents, legs }) => run(() => settleAccumulator(stakeCents, legs)),
  );

  server.tool(
    'settle_each_way',
    'Settle an each-way bet (win + place parts); total staked is 2x stakeCents.',
    {
      stakeCents: z.number().int().positive(),
      decimalOdds,
      placeFraction: z.number().gt(0).lte(1).describe('Place terms, e.g. 0.25 for 1/4 odds'),
      result: z.enum(['win', 'place', 'lose']),
    },
    ({ stakeCents, decimalOdds: odds, placeFraction, result: r }) =>
      run(() => settleEachWay(stakeCents, odds, placeFraction, r)),
  );

  server.tool(
    'kelly_stake',
    'Kelly-criterion stake for an edge; negative edge recommends no stake.',
    {
      decimalOdds,
      probability: z.number().gt(0).lt(1).describe('Your estimated true win probability'),
      bankrollCents: z.number().int().positive(),
      fraction: z.number().gt(0).lte(1).default(1).describe('Fractional-Kelly multiplier'),
    },
    ({ decimalOdds: odds, probability, bankrollCents, fraction }) =>
      run(() => kelly(odds, probability, bankrollCents, fraction)),
  );
}
