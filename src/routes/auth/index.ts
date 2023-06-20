import express from 'express';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import authController from '@/controllers/auth.controller';
import { signInSchema } from '@/schema/auth.schema';
import { otpSchema } from '@/schema/otp.schema';

/**
 * @login required email , password // send code
 *
 */

const router = express.Router();

router.post('/sign-in', validateRequest(signInSchema), catchError(authController.signIn));

router.post('/authcode', validateRequest(otpSchema), catchError(authController.authCode));

router.post('/forget-pwd', catchError(authController.getNewPassWord));

router.get('/new-access-token', catchError(authController.getNewAccessToken));

/// check header have access token userId
router.use(checkUser);

router.post('/sign-out', catchError(authController.signOut));

// router.post('/staymate/signin', catchError(authController.forgetPwd));

// router.use(catchError(isAuth));

export default router;
