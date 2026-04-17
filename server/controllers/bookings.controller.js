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
    const message = result.status === 'pending' ? 'Booking Request Sent!' : 'Booking Confirmed!';
    res.status(201).json({ message, ...result });
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

async function getByStylist(req, res) {
  try {
    const data = await bookingsDao.getStylistBookings(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getPendingForStylist(req, res) {
  try {
    const data = await bookingsDao.getPendingBookingsForStylist(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllPending(req, res) {
  try {
    const data = await bookingsDao.getAllPendingBookings();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function searchBookings(req, res) {
  try {
    const q = req.query.q;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }
    const data = await bookingsDao.searchBookings(q);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function approve(req, res) {
  try {
    const data = await bookingService.approveBooking(req.params.id, req.user.email);
    res.json({ message: 'Booking approved', data });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function reject(req, res) {
  try {
    const data = await bookingService.rejectBooking(req.params.id, req.user.email);
    res.json({ message: 'Booking rejected', data });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function cancel(req, res) {
  try {
    const data = await bookingService.cancelBooking(req.params.id, req.user.id);
    res.json({ message: 'Booking cancelled', data });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function complete(req, res) {
  try {
    const result = await bookingService.completeBooking(req.params.id, req.user.email);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function reschedule(req, res) {
  try {
    const result = await bookingService.rescheduleBooking(req.params.id, req.body.new_start_time, req.user.id);
    res.json({ message: 'Booking rescheduled', data: result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

async function exportIcs(req, res) {
  try {
    const icsContent = await bookingService.exportBookingIcs(req.params.id, req.user.id);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${req.params.id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { getAll, create, createGuest, getByCustomer, getByStylist, getPendingForStylist, getAllPending, searchBookings, approve, reject, cancel, complete, reschedule, exportIcs };