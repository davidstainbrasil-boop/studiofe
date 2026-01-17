/**
 * E2E Test Runner Script
 * Run with: npx tsx scripts/run-e2e-tests.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  console.log('================================================');
  console.log('🧪 Running E2E Pipeline Tests');
  console.log('================================================\n');

  // Import test runner
  const { runE2ETests } = await import('../src/__tests__/e2e/pipeline.test');
  
  const results = await runE2ETests();

  console.log('\n================================================');
  console.log('📊 Results:');
  console.log('================================================');
  
  results.results.forEach(r => console.log(`  ${r}`));

  console.log('\n------------------------------------------------');
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  📊 Total:  ${results.passed + results.failed}`);
  console.log('------------------------------------------------\n');

  if (results.failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
