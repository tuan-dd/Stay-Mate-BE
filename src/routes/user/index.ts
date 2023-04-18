import userController from '@/controllers/user.controller';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import { createUserSchema, updateUserSchema } from '@/schema/user.schema';
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
  '/sign-up',
  validateRequest(createUserSchema),
  catchError(userController.createUser),
);

// check header
router.use(checkUser);

router.put(
  '/user-update',
  validateRequest(updateUserSchema),
  catchError(userController.updateUser),
);

export default router;
