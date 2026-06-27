/**
 * Integration: save rule → API fetch → evaluate → PDF HTML
 */
import prisma from '../src/lib/prisma.js';
import { evaluateSmartResultPoints, renderAdminSmartResultPointsHTML } from '../../frontend/src/lib/smart-result-evaluator.ts';

const slug = 'break-even-pro-test-' + Date.now();
let createdId = null;

try {
  const row = await prisma.smartResultPoint.create({
    data: {
      modelSlug: 'break-even-pro',
      message: 'Integration test message',
      color: '#16a34a',
      conditions: JSON.stringify([{ field: 'isProfitable', op: 'eq', value: true }]),
      combineMode: 'all',
      isPublished: true,
      sortOrder: 9999,
    },
  });
  createdId = row.id;

  const res = await fetch('http://localhost:5001/api/smart-result-points?modelSlug=break-even-pro');
  const data = await res.json();
  const testPoint = data.points.find((p) => p.id === createdId);
  if (!testPoint) throw new Error('Created point not returned by public API');

  const matched = evaluateSmartResultPoints(
    { isProfitable: true },
    data.points.filter((p) => p.id === createdId)
  );
  if (matched.length !== 1) throw new Error('Expected 1 match for profitable output');

  const unmatched = evaluateSmartResultPoints(
    { isProfitable: false },
    data.points.filter((p) => p.id === createdId)
  );
  if (unmatched.length !== 0) throw new Error('Expected 0 matches for unprofitable output');

  const html = renderAdminSmartResultPointsHTML(matched);
  if (!html.includes('Smart Results') || !html.includes('Integration test message')) {
    throw new Error('PDF HTML missing expected content');
  }

  console.log('✓ Integration test passed (DB → API → evaluate → PDF HTML)');
} catch (e) {
  console.error('✗ Integration test failed:', e.message);
  process.exit(1);
} finally {
  if (createdId) {
    await prisma.smartResultPoint.delete({ where: { id: createdId } }).catch(() => {});
  }
  await prisma.$disconnect();
}
