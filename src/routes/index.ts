import express from 'express';
import { getLogger } from '@/utils/loggers';
import authRouter from './auth';
import userRouter from './user';
import hotelRouter from './hotel';
import adminRouter from './admin';
import paymentRouter from './payment';

const router = express.Router();
const logger = getLogger('INDEX_ROUTE');

/* GET home page. */
router.get('/', function (_req, res) {
  logger.info('hello Express');
  res.send('Welcome Stay Mate booking ');
});

router.use('/v1/api/auth', authRouter);
router.use('/v1/api/user', userRouter);
router.use('/v1/api/hotel', hotelRouter);
router.use('/v1/api/admin', adminRouter);
router.use('/v1/api/payment', paymentRouter);

export default router;
