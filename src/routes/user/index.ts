import userController from '@/controllers/user.controller';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import { createUserSchema } from '@/schema/user.schema';
import express from 'express';

const router = express.Router();

/**
 * @Admin send new pass(random)to email user
 * block user
 * see all user ( cant not see money,password)
 * @user can see all my account
 */

// create Account
router.post(
  '/signup',
  validateRequest(createUserSchema),
  catchError(userController.createUser),
);

router.use(checkUser);

export default router;
