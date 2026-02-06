import { runLiveTests } from './src/e2e/LiveTestRunner.js';

console.log('Starting live tests...');

runLiveTests().then((summary) => {
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch((err) => {
  console.error('Live test run failed:', err);
  process.exit(1);
});
