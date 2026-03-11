import { randomInt } from 'crypto';

// ---------------------------------------------------------------------------
// Generates a cryptographically random 16-digit account number
// Format: XXXX-XXXX-XXXX-XXXX
// ---------------------------------------------------------------------------

export function generateAccountNumber(): string {
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) {
    // randomInt(min, max) — max is exclusive, so 0–9999
    const group = randomInt(0, 10000).toString().padStart(4, '0');
    groups.push(group);
  }
  return groups.join('-');
}
