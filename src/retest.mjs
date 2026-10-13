import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';
import { checkDecider } from '../scripts/decider-test.mjs';
import { fixtureRequests8 } from '../scripts/fixture-8.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';

// Runs the stage 6~9 normal/forbidden practice requests in the same server process right after
// a restore. Each result is what this run actually observed; nothing is filled in by hand.
export async function retestPolicies() {
  const results = [];
  for (const item of await checkDecider({ decide, ruleIds: RULE_IDS })) {
    results.push({ stage: item.name.includes('복합') ? 7 : 6, name: item.name, passed: item.passed });
  }
  for (const [name, request] of Object.entries(fixtureRequests8())) {
    const expected = name === 'own' ? 'allow' : 'deny';
    const output = await decide(request);
    results.push({ stage: 8, name: `${name} → ${expected}`, observed: output.decision,
      passed: output.decision === expected });
  }
  for (const item of await checkDetection(detect)) {
    results.push({ stage: 9, name: item.name, passed: item.passed });
  }
  return results;
}
