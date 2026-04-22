const { calculatePrice } = require('../utils/pricing');

// Same two-condition overlap check used in availability.service.js and bookings.dao.js
// Extracted here as a pure function so it can be tested without database calls
function hasOverlap(newStart, newEnd, existingStart, existingEnd) {
  return newStart < existingEnd && newEnd > existingStart;
}

// Same slot generation logic from availability.service.js
// Generates 30-min slots between shift start and end, excluding any where
// the service duration would overflow past the shift end
function generateSlots(shiftStart, shiftEnd, serviceDuration) {
  const [sH, sM] = shiftStart.split(':').map(Number);
  const [eH, eM] = shiftEnd.split(':').map(Number);
  const shiftStartMin = sH * 60 + sM;
  const shiftEndMin = eH * 60 + eM;

  const slots = [];
  let currentMin = shiftStartMin;

  while (currentMin + serviceDuration <= shiftEndMin) {
    const hour = String(Math.floor(currentMin / 60)).padStart(2, '0');
    const min = String(currentMin % 60).padStart(2, '0');
    slots.push(`${hour}:${min}`);
    currentMin += 30;
  }
  return slots;
}

// -- Dynamic Pricing tests (FR-13) ------------------------------------

describe('Dynamic Pricing — calculatePrice', () => {

  test('base price with multiplier 1.0 on non-peak day returns base price', () => {
    const result = calculatePrice(40, 1.0, '2026-04-22T10:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(40);
    expect(result.isPeak).toBe(false);
  });

  test('stylist multiplier scales base price correctly', () => {
    const result = calculatePrice(40, 1.5, '2026-04-22T10:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(60);
    expect(result.isPeak).toBe(false);
  });

  test('peak day applies surcharge (Friday morning)', () => {
    const result = calculatePrice(40, 1.0, '2026-04-24T10:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(46);
    expect(result.isPeak).toBe(true);
  });

  test('peak hour applies surcharge (Wednesday evening)', () => {
    const result = calculatePrice(40, 1.0, '2026-04-22T18:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(46);
    expect(result.isPeak).toBe(true);
  });

  test('peak day OR peak hour — both trigger surcharge (Friday evening)', () => {
    // surcharge applied once not twice, OR condition
    const result = calculatePrice(40, 1.0, '2026-04-24T18:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(46);
    expect(result.isPeak).toBe(true);
  });

  test('exactly at peak hour boundary applies surcharge', () => {
    // 17:00 should trigger because the check is >= peakHourStart
    const result = calculatePrice(40, 1.0, '2026-04-22T17:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(46);
    expect(result.isPeak).toBe(true);
  });

  test('one minute before peak hour does not apply surcharge', () => {
    const result = calculatePrice(40, 1.0, '2026-04-22T16:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(40);
    expect(result.isPeak).toBe(false);
  });

  test('surcharge of 0% results in no price change on peak day', () => {
    const result = calculatePrice(40, 1.0, '2026-04-24T10:00:00', 0, [5, 6], 17);
    expect(result.price).toBe(40);
    expect(result.isPeak).toBe(true);
  });

  test('multiplier and surcharge combine correctly', () => {
    // 40 * 1.5 = 60, then 60 * 1.15 = 69
    const result = calculatePrice(40, 1.5, '2026-04-24T10:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(69);
    expect(result.isPeak).toBe(true);
  });

  test('result is rounded to 2 decimal places', () => {
    // 40 * 1.3 = 52, then 52 * 1.15 = 59.8
    const result = calculatePrice(40, 1.3, '2026-04-24T10:00:00', 15, [5, 6], 17);
    expect(result.price).toBe(59.8);
    expect(result.isPeak).toBe(true);
  });

});

// -- Conflict Detection tests (FR-04) ---------------------------------

describe('Conflict Detection — overlap logic', () => {

  // helper to create timestamps for a given hour and minute
  const t = (h, m = 0) => new Date(2026, 3, 22, h, m).getTime();

  test('identical time ranges conflict', () => {
    expect(hasOverlap(t(10), t(11), t(10), t(11))).toBe(true);
  });

  test('new booking partially overlaps start of existing', () => {
    // New: 09:30-10:30, Existing: 10:00-11:00
    expect(hasOverlap(t(9, 30), t(10, 30), t(10), t(11))).toBe(true);
  });

  test('new booking partially overlaps end of existing', () => {
    // New: 10:30-11:30, Existing: 10:00-11:00
    expect(hasOverlap(t(10, 30), t(11, 30), t(10), t(11))).toBe(true);
  });

  test('new booking entirely contains existing', () => {
    // New: 09:00-12:00, Existing: 10:00-11:00
    expect(hasOverlap(t(9), t(12), t(10), t(11))).toBe(true);
  });

  test('existing booking entirely contains new', () => {
    // New: 10:15-10:45, Existing: 10:00-11:00
    expect(hasOverlap(t(10, 15), t(10, 45), t(10), t(11))).toBe(true);
  });

  test('touching boundaries do NOT conflict (end equals start)', () => {
    // New: 11:00-12:00, Existing: 10:00-11:00
    // strict < and > means touching is allowed
    expect(hasOverlap(t(11), t(12), t(10), t(11))).toBe(false);
  });

  test('completely separate time ranges do not conflict', () => {
    // New: 14:00-15:00, Existing: 10:00-11:00
    expect(hasOverlap(t(14), t(15), t(10), t(11))).toBe(false);
  });

});

// -- Availability Slot Generation tests (FR-03) -----------------------

describe('Availability — slot generation', () => {

  test('generates correct slots for 60-min service in 09:00-17:00 shift', () => {
    const slots = generateSlots('09:00', '17:00', 60);
    // first slot 09:00, last slot 16:00 (16:00 + 60 = 17:00, fits exactly)
    expect(slots[0]).toBe('09:00');
    expect(slots[slots.length - 1]).toBe('16:00');
    expect(slots.length).toBe(15);
  });

  test('service exactly fills remaining shift time — slot included', () => {
    // shift 09:00-10:00, 60-min service — one slot at 09:00
    const slots = generateSlots('09:00', '10:00', 60);
    expect(slots).toEqual(['09:00']);
  });

  test('service exceeds remaining shift time — slot excluded', () => {
    // shift 09:00-10:00, 90-min service — no slots possible
    const slots = generateSlots('09:00', '10:00', 90);
    expect(slots).toEqual([]);
  });

  test('zero-length shift produces no slots', () => {
    const slots = generateSlots('09:00', '09:00', 30);
    expect(slots).toEqual([]);
  });

  test('30-min service generates slots at 30-min intervals', () => {
    // shift 09:00-11:00, 30-min service
    const slots = generateSlots('09:00', '11:00', 30);
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  test('service longer than entire shift produces no slots', () => {
    // shift 09:00-10:00, 120-min service
    const slots = generateSlots('09:00', '10:00', 120);
    expect(slots).toEqual([]);
  });

});

// -- Timezone Offset tests (BST/GMT handling) -------------------------

// Same function from availability.service.js — converts a date string
// to the number of minutes London is ahead of UTC on that date
function londonOffsetMinutes(dateStr) {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const hour = parseInt(
    probe.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }),
    10
  );
  return (hour - 12) * 60;
}

describe('Timezone — londonOffsetMinutes', () => {

  test('winter date returns 0 (GMT, no offset)', () => {
    // January is always GMT
    expect(londonOffsetMinutes('2026-01-15')).toBe(0);
  });

  test('summer date returns 60 (BST, +1 hour)', () => {
    // July is always BST
    expect(londonOffsetMinutes('2026-07-15')).toBe(60);
  });

  test('day after clocks spring forward returns 60', () => {
    // 2026 clocks go forward last Sunday of March = 29 March
    // 30 March should be BST
    expect(londonOffsetMinutes('2026-03-30')).toBe(60);
  });

  test('day before clocks spring forward returns 0', () => {
    // 28 March 2026 is still GMT
    expect(londonOffsetMinutes('2026-03-28')).toBe(0);
  });

  test('day after clocks fall back returns 0', () => {
    // 2026 clocks go back last Sunday of October = 25 October
    // 26 October should be GMT
    expect(londonOffsetMinutes('2026-10-26')).toBe(0);
  });

  test('day before clocks fall back returns 60', () => {
    // 24 October 2026 is still BST
    expect(londonOffsetMinutes('2026-10-24')).toBe(60);
  });

});

// -- Date Range Generation tests (shift overrides) --------------------

// Same function from shift_override.service.js — generates array of
// date strings between start and end inclusive
function dateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date((endDate || startDate) + 'T12:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

describe('Date Range — dateRange', () => {

  test('single date with no end date returns one-element array', () => {
    expect(dateRange('2026-04-20')).toEqual(['2026-04-20']);
  });

  test('same start and end returns one-element array', () => {
    expect(dateRange('2026-04-20', '2026-04-20')).toEqual(['2026-04-20']);
  });

  test('three-day range returns 3 dates in order', () => {
    expect(dateRange('2026-04-20', '2026-04-22')).toEqual([
      '2026-04-20', '2026-04-21', '2026-04-22'
    ]);
  });

  test('week-long range returns 7 dates', () => {
    const result = dateRange('2026-04-20', '2026-04-26');
    expect(result.length).toBe(7);
    expect(result[0]).toBe('2026-04-20');
    expect(result[6]).toBe('2026-04-26');
  });

  test('range spanning month boundary works correctly', () => {
    expect(dateRange('2026-04-29', '2026-05-02')).toEqual([
      '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02'
    ]);
  });

});