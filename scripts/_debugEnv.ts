import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('env file exists:', fs.existsSync(envPath));

for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  process.env[key] = val;
  console.log(`loaded: ${key} = ${val.slice(0, 20)}...`);
}

console.log('ANTHROPIC_API_KEY in env:', process.env.ANTHROPIC_API_KEY?.slice(0, 20));

import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
console.log('Anthropic client created OK');
