import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Drives the real server over stdio with the MCP client — proves the tools are
// registered and callable end to end, not just that the math is correct.
describe('mcp server (stdio)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ name: 'test-client', version: '0.0.0' });
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'src/index.ts'],
    });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it('exposes the betting tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'bookmaker_margin',
        'convert_odds',
        'kelly_stake',
        'parlay_odds',
        'settle_accumulator',
        'settle_each_way',
        'settle_single',
      ].sort(),
    );
  });

  it('converts odds through a tool call', async () => {
    const res = await client.callTool({
      name: 'convert_odds',
      arguments: { odds: '3/2', format: 'fractional' },
    });
    const content = res.content as { type: string; text: string }[];
    const parsed = JSON.parse(content[0]!.text) as { decimal: number; american: number };
    expect(parsed.decimal).toBeCloseTo(2.5);
    expect(parsed.american).toBe(150);
  });

  it('sizes a Kelly stake through a tool call', async () => {
    const res = await client.callTool({
      name: 'kelly_stake',
      arguments: { decimalOdds: 2, probability: 0.6, bankrollCents: 100000 },
    });
    const content = res.content as { type: string; text: string }[];
    const parsed = JSON.parse(content[0]!.text) as { stakeCents: number };
    expect(parsed.stakeCents).toBe(20000);
  });

  it('returns a tool error for invalid odds', async () => {
    const res = await client.callTool({
      name: 'convert_odds',
      arguments: { odds: 0.5, format: 'decimal' },
    });
    expect(res.isError).toBe(true);
  });
});
