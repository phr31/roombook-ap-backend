import { Router } from 'express';
import authenticate from '../middlewares/auth.js';
import { list } from '../controllers/allowlistController.js';

const router = Router();

router.use(authenticate);

router.get('/', list);

export default router;
