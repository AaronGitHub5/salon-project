const bookingService = require('../services/booking.service');
const bookingsDao = require('../daos/bookings.dao');

async function getAll(req, res) {
  try {
    const data = await bookingsDao.getAllBookings();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const result = await bookingService.createBooking(req.body);
    res.status(201).json({ message: 'Booking Confirmed!', ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function createGuest(req, res) {
  try {
    const result = await bookingService.createGuestBooking(req.body);
    res.status(201).json({ message: 'Shadow Booking Created', ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function getByCustomer(req, res) {
  try {
    const data = await bookingsDao.getCustomerBookings(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function cancel(req, res) {
  try {
    const data = await bookingService.cancelBooking(req.params.id);
    res.json({ message: 'Booking cancelled', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function complete(req, res) {
  try {
    const result = await bookingService.completeBooking(req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { getAll, create, createGuest, getByCustomer, cancel, complete };
