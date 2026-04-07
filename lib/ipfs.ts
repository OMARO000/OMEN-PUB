import PinataClient from '@pinata/sdk';
import type { RawBlock } from './agent/types';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let _client: PinataClient | null = null;

function getClient(): PinataClient {
  if (!_client) {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error('PINATA_API_KEY and PINATA_SECRET_KEY must be set in .env.local');
    }
    _client = new PinataClient(apiKey, secretKey);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Pin a single block to IPFS
// ---------------------------------------------------------------------------

export interface IpfsResult {
  cid: string;
  url: string;
}

export async function pinBlock(block: RawBlock): Promise<IpfsResult> {
  const client = getClient();

  const payload = {
    ...block,
    _omenVersion: '1.0',
    _pinnedAt: new Date().toISOString(),
  };

  const result = await client.pinJSONToIPFS(payload, {
    pinataMetadata: {
      name: block.blockId,
      keyvalues: {
        ticker: block.companyTicker,
        category: block.category,
        violationTag: block.violationTag,
      },
    } as any,
    pinataOptions: {
      cidVersion: 1,
    },
  });

  return {
    cid: result.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
  };
}

// ---------------------------------------------------------------------------
// Pin multiple blocks — returns map of blockId → IpfsResult
// ---------------------------------------------------------------------------

export async function pinBlocks(
  blocks: RawBlock[]
): Promise<Map<string, IpfsResult>> {
  const results = new Map<string, IpfsResult>();

  for (const block of blocks) {
    try {
      const result = await pinBlock(block);
      results.set(block.blockId, result);
      console.log(`  [IPFS] ${block.blockId} → ${result.cid}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [IPFS ERROR] ${block.blockId}: ${msg}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Test connection
// ---------------------------------------------------------------------------

export async function testPinataConnection(): Promise<boolean> {
  try {
    const client = getClient();
    await client.testAuthentication();
    console.log('[IPFS] Pinata connection OK');
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[IPFS] Pinata connection failed: ${msg}`);
    return false;
  }
}
