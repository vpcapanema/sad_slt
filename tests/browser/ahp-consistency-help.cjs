const assert = require('node:assert/strict');
require('../../ahp/js/ahp-core.js');
const ahp = globalThis.SLTAhp;
const matrix = ahp.matrixFromUpper(5, (i, j) => i === 0 && j === 4 ? 1 / 9 : 3);
const original = JSON.stringify(matrix);
const pairs = [];
for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push(`${i}_${j}`);
assert.deepEqual(ahp.consistencyReviews(matrix, new Set(pairs.slice(0, 6))), []);
assert.deepEqual(ahp.consistencyReviews(matrix, new Set(pairs.slice(0, 7))), [], 'Exactly 70% stays hidden');
const reviews = ahp.consistencyReviews(matrix, new Set(pairs.slice(0, 8)));
assert.ok(reviews.length > 0 && reviews.length <= 3, 'Above 70% returns ranked reviews');
const current = ahp.analyzeMatrix(matrix).CR;
for (const pair of reviews) {
  assert.ok(pairs.slice(0, 8).includes(`${pair.i}_${pair.j}`), 'Only answered pairs');
  assert.ok(pair.projectedCR < current);
}
assert.equal(JSON.stringify(matrix), original, 'Suggestions never mutate judgments');
assert.deepEqual(ahp.consistencyReviews(ahp.matrixFromUpper(5, () => 1), new Set(pairs)), []);
assert.deepEqual(ahp.consistencyReviews([[1, 3], [1 / 3, 1]], new Set(['0_1'])), []);
assert.ok(ahp.consistencyReviews(matrix, new Set(pairs)).length > 0);
const full = ahp.consistencyReviews(matrix, new Set(pairs));
assert.ok(full.some(pair => pair.i === 0 && pair.j === 4), 'The contradictory pair is identified');
assert.ok(full.every((pair, index) => !index || pair.improvement <= full[index - 1].improvement));
console.log('PASS: strict 70% threshold, answered pairs, consistency, ranking and immutable judgments.');
