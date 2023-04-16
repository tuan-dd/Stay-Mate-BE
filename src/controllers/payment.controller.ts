import { BadRequest, Created, SuccessResponse } from '@/helpers/utils';
import { ChargeSchema } from '@/schema/user.schema';
import UserService from '@/services/user.service';

import { Response, Request } from 'express';
import { test } from 'node:test';
class PaymentController {
  createBooking = async (req: Request<any, any, any>, res: Response) => {
    new Created({
      message: 'create Booking successfully',
    }).send(res);
  };

  paymentBooking = async (req: Request<any, any, any>, res: Response) => {
    new SuccessResponse({
      message: 'payment Booking successfully',
    }).send(res);
  };

  cancelBooking = async (req: Request<any, any, any>, res: Response) => {
    new SuccessResponse({
      message: 'cancel Booking successfully',
    }).send(res);
  };

  paymentMembership = async (req: Request<any, any, any>, res: Response) => {
    new Created({
      message: 'payment Membership successfully',
    }).send(res);
  };
}

const paymentBooking = new PaymentController();

export default paymentBooking;
