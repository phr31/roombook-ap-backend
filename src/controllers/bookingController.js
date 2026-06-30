import { getAllBookings, createBooking, deleteBooking } from '../services/bookingService.js';

export async function list(req, res, next) {
  try {
    res.json(await getAllBookings());
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    res.status(201).json(await createBooking(req.body, req.user));
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await deleteBooking(req.params.id, req.user.uid);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}
