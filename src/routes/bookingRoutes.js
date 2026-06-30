import { Router } from 'express';
import authenticate from '../middlewares/auth.js';
import { list, create, remove } from '../controllers/bookingController.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

export default router;
