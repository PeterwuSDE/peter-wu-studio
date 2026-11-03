import assert from 'node:assert/strict';
import test from 'node:test';
import { products, filterProducts, addToCart, setQuantity, cartTotal, createBooking, moveBooking, cancelBooking, validateInquiry, availableTime } from '../public/demos/shared/model.mjs';

test('filters the catalog by category and case-insensitive search', () => {
  assert.ok(products.length >= 4);
  assert.ok(filterProducts('Tableware', '').every(p => p.category === 'Tableware'));
  assert.equal(filterProducts('All', 'vAsE')[0].id, 'arc-vase');
  assert.equal(filterProducts('All', 'missing').length, 0);
});
test('cart combines variants, separates colors and totals integer cents', () => {
  let cart = addToCart([], 'arc-vase', 'Chalk');
  cart = addToCart(cart, 'arc-vase', 'Chalk');
  cart = addToCart(cart, 'arc-vase', 'Clay');
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cartTotal(cart), products[0].price * 3);
  assert.equal(setQuantity(cart, cart[0].key, 0).length, 1);
});
test('rejects invalid products, variants, quantities and stock overflow', () => {
  assert.throws(() => addToCart([], 'missing', 'Chalk'));
  assert.throws(() => addToCart([], 'arc-vase', 'missing'));
  const cart = addToCart([], 'arc-vase', 'Chalk');
  for (const q of [-1, 1.5, NaN, Infinity, 100]) assert.throws(() => setQuantity(cart, cart[0].key, q));
  const full = setQuantity(cart, cart[0].key, products[0].stock);
  assert.throws(() => addToCart(full, 'arc-vase', 'Chalk'));
  assert.equal(cart[0].quantity, 1);
});
test('bookings prevent collisions during creation and rescheduling', () => {
  const first = createBooking([], { service: 'Consultation', day: 'Monday', time: '09:00' });
  const next = createBooking(first, { service: 'Site visit', day: 'Tuesday', time: '10:30' });
  assert.throws(() => createBooking(next, { service: 'Consultation', day: 'Monday', time: '09:00' }));
  assert.throws(() => moveBooking(next, first[0].id, 'Tuesday', '10:30'));
  const moved = moveBooking(next, first[0].id, 'Wednesday', '14:00');
  assert.equal(moved[0].day, 'Wednesday');
  assert.equal(cancelBooking(moved, first[0].id).length, 1);
  assert.equal(next[0].day, 'Monday');
});
test('rejects invalid booking inputs', () => {
  for (const data of [
    { service: '', day: 'Monday', time: '09:00' },
    { service: 'Consultation', day: 'Sunday', time: '09:00' },
    { service: 'Consultation', day: 'Monday', time: '03:15' },
  ]) assert.throws(() => createBooking([], data));
  assert.throws(() => moveBooking([], 'missing', 'Monday', '09:00'));
});
test('inquiry validates service, area and timing', () => {
  assert.equal(validateInquiry({ service: 'Painting', area: 'Central', timing: 'This month' }), '');
  for (const data of [{}, { service: 'Other', area: 'Central', timing: 'This month' }, { service: 'Painting', area: '', timing: 'This month' }]) assert.ok(validateInquiry(data));
});

test('rescheduling recovers a valid selection after a fully booked day', () => {
  const full = ['09:00', '10:30', '14:00', '15:30'].reduce((bookings, time) => createBooking(bookings, { service: 'Consultation', day: 'Monday', time }), []);
  assert.equal(availableTime(full, 'new', 'Monday', '09:00'), '');
  assert.equal(availableTime(full, 'new', 'Tuesday', ''), '09:00');
  assert.equal(availableTime(full, full[0].id, 'Monday', '09:00'), '09:00');
});
