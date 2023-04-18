import { Status } from '@/models/Booking';
import { Package } from '@/models/Hotel';
import { Types } from 'mongoose';

import * as Yup from 'yup';

// add function check objectId
Yup.addMethod<Yup.StringSchema>(
  Yup.string,
  'objectIdValid',
  function (message?: string) {
    return this.test('objectIdValid', message || 'Wrong Id', (value) =>
      Types.ObjectId.isValid(value),
    );
  },
);

declare module 'yup' {
  interface Schema<
    TType = any,
    TContext = any,
    TDefault = any,
    TFlags extends Yup.Flags = '',
  > {
    objectIdValid(message?: string): this;
  }
}
export const chargeSchema = Yup.object().shape({
  body: Yup.object().shape({
    balance: Yup.number().min(1).required(),
  }),
});

export const withdrawSchema = Yup.object().shape({
  body: Yup.object().shape({
    password: Yup.string().required(),
    withdraw: Yup.number().min(1).required(),
  }),
});

export const createBookingSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'no input value'),
    rooms: Yup.array(
      Yup.object().shape({
        roomTypeId: Yup.string().objectIdValid().required(),
        quantity: Yup.number().min(1).integer().required(),
      }),
    ),
    hotelId: Yup.string().objectIdValid().required(),
    startDate: Yup.date().min(new Date()).required(),
    endDate: Yup.date()
      .test(
        'compareStartDate',
        'Not less or equal than start date',
        (endDate: Date, context) =>
          endDate <= context.parent.startDate ? false : true,
      )
      .required(),
  }),
});

export const paymentBookingSchema = Yup.object().shape({
  body: Yup.object().shape({
    password: Yup.string().required(),
    bookingId: Yup.string().objectIdValid().required(),
    hotelierId: Yup.string().objectIdValid('Wrong Id').required(),
  }),
});

export const cancelBookingSchema = Yup.object().shape({
  body: Yup.object().shape({
    bookingId: Yup.string().objectIdValid('Wrong Id').required(),
    hotelierId: Yup.string().objectIdValid('Wrong Id').required(),
  }),
});

export const paymentMembershipSchema = Yup.object().shape({
  body: Yup.object().shape({
    password: Yup.string().required(),
    package: Yup.string().oneOf(Object.values(Package)).required(),
  }),
});

export const getPayments = Yup.object().shape({
  body: Yup.object().shape({
    page: Yup.number().integer().min(1).notRequired(),
    status: Yup.string().oneOf(Object.values(Status)).notRequired(),
  }),
});

export type ChargeSchema = Yup.InferType<typeof chargeSchema>['body'];
export type WithdrawSchema = Yup.InferType<typeof withdrawSchema>['body'];
export type PaymentMembershipSchema = Yup.InferType<
  typeof paymentMembershipSchema
>['body'];
export type CreateBookingSchema = Yup.InferType<
  typeof createBookingSchema
>['body'];
export type PaymentBookingSchema = Yup.InferType<
  typeof paymentBookingSchema
>['body'];
export type CancelBookingSchema = Yup.InferType<
  typeof cancelBookingSchema
>['body'];
export type GetPayments = Yup.InferType<typeof getPayments>['body'];
