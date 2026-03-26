const shiftsDao = require('../daos/shifts.dao');

// day_of_week: 0 = Sunday, 1 = Monday ... 6 = Saturday
const VALID_DAYS = [0, 1, 2, 3, 4, 5, 6];

function validateTimeFormat(t) {
  return /^\d{2}:\d{2}$/.test(t);
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function getShiftsForStylist(stylistId) {
  return shiftsDao.getShiftsByStylist(stylistId);
}

async function getAllShifts() {
  return shiftsDao.getAllShifts();
}

async function createShift({ stylist_id, day_of_week, start_time, end_time }) {
  if (!VALID_DAYS.includes(Number(day_of_week))) {
    throw Object.assign(new Error('day_of_week must be 0–6'), { status: 400 });
  }
  if (!validateTimeFormat(start_time) || !validateTimeFormat(end_time)) {
    throw Object.assign(new Error('start_time and end_time must be HH:MM'), { status: 400 });
  }
  if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
    throw Object.assign(new Error('start_time must be before end_time'), { status: 400 });
  }

  // Prevent duplicate shift for same stylist + day
  const existing = await shiftsDao.getShiftForDay(stylist_id, day_of_week);
  if (existing) {
    throw Object.assign(
      new Error(`Stylist already has a shift on day ${day_of_week}. Use PUT to update it.`),
      { status: 409 }
    );
  }

  return shiftsDao.createShift({ stylist_id, day_of_week, start_time, end_time });
}

async function updateShift(id, { day_of_week, start_time, end_time }) {
  if (!validateTimeFormat(start_time) || !validateTimeFormat(end_time)) {
    throw Object.assign(new Error('start_time and end_time must be HH:MM'), { status: 400 });
  }
  if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
    throw Object.assign(new Error('start_time must be before end_time'), { status: 400 });
  }
  return shiftsDao.updateShift(id, { day_of_week, start_time, end_time });
}

async function deleteShift(id) {
  return shiftsDao.deleteShift(id);
}

module.exports = {
  getShiftsForStylist,
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
};
