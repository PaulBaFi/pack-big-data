import test from 'node:test';
import assert from 'node:assert/strict';
import { lineTotal, saleTotals } from '../src/utils/calculations.ts';

test('calcula subtotal por cantidad y precio', () => {
  assert.equal(lineTotal(12.5, 4), 50);
});

test('calcula neto, impuesto 18% y total de una venta', () => {
  assert.deepEqual(saleTotals([
    { PRECIO_UNITARIO: 100, CANTIDAD: 2 },
    { PRECIO_UNITARIO: 50, CANTIDAD: 1 },
  ]), { TOTAL_NETO: 250, IMPUESTO: 45, TOTAL_DOCUMENTO: 295 });
});
