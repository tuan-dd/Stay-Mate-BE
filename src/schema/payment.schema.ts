/* eslint-disable @typescript-eslint/no-unused-vars */
import { EStatus } from '@/models/Booking';
import { Package } from '@/models/Hotel';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dayjs from 'dayjs';
import * as Yup from 'yup';

dayjs.extend(utc);
dayjs.extend(timezone);

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
    createdAt: Yup.date()
      .test(
        'check createdAt',
        'createdAt not greater than now date',
        (createdAt) => !dayjs(createdAt, 'YYYY-MM-DD').isAfter(dayjs(), 'day'),
      )
      .notRequired(),
    startDate: Yup.date()
      .test('checkBooking', 'Start Date not less than now date', (startDate) => {
        const numberStartDate = dayjs(startDate)
          .tz('Asia/Ho_Chi_Minh')
          .set('hour', 10)
          .set('minute', 0)
          .unix(); // get number
        const numberDayNow = dayjs().tz('Asia/Ho_Chi_Minh').unix(); // get number
        return numberDayNow - numberStartDate < 60 * 60 * 24;
      })
      .required(),
    endDate: Yup.date()
      .test('compareStartDate', 'Not less or equal than start date', (endDate, context) =>
        endDate <= context.parent.startDate ? false : true,
      )
      .required(),
  }),
});

export const paymentBookingSchema = Yup.object().shape({
  body: Yup.object().shape({
    password: Yup.string().required(),
    bookingId: Yup.string().objectIdValid().required(),
    hotelId: Yup.string().objectIdValid('Wrong Id').required(),
  }),
});

export const cancelBookingSchema = Yup.object().shape({
  body: Yup.object().shape({
    bookingId: Yup.string().objectIdValid('Wrong Id').required(),
    hotelId: Yup.string().objectIdValid('Wrong Id').required(),
  }),
});

export const paymentMembershipSchema = Yup.object().shape({
  body: Yup.object().shape({
    password: Yup.string().required(),
    package: Yup.string()
      .oneOf(Object.values(Package).filter((e) => e !== Package.FREE))
      .required(),
  }),
});

export const getBookingSchema = Yup.object().shape({
  query: Yup.object().shape({
    page: Yup.number().integer().min(1).notRequired(),
    status: Yup.string().oneOf(Object.values(EStatus)).notRequired(),
  }),
});

export const getBookingByHotelierSchema = Yup.object().shape({
  query: Yup.object().shape({
    allHotel: Yup.boolean().required(),
    hotelId: Yup.string()
      .objectIdValid()
      .when('allHotel', (allHotel, field) =>
        allHotel[0] ? field.notRequired() : field.required(),
      ),
    page: Yup.number().integer().min(1).notRequired(),
    status: Yup.string().oneOf(Object.values(EStatus)).notRequired(),
  }),
});

export const getMembershipSchema = Yup.object().shape({
  query: Yup.object().shape({
    page: Yup.number().integer().min(1).notRequired(),
    package: Yup.string()
      .oneOf(Object.values(Package).filter((e) => e !== Package.FREE))
      .notRequired(),
    isExpire: Yup.boolean().notRequired(),
  }),
});

export type ChargeSchema = Yup.InferType<typeof chargeSchema>['body'];
export type WithdrawSchema = Yup.InferType<typeof withdrawSchema>['body'];
export type PaymentMembershipSchema = Yup.InferType<
  typeof paymentMembershipSchema
>['body'];
export type CreateBookingSchema = Yup.InferType<typeof createBookingSchema>['body'];
export type PaymentBookingSchema = Yup.InferType<typeof paymentBookingSchema>['body'];
export type CancelBookingSchema = Yup.InferType<typeof cancelBookingSchema>['body'];
export type GetBookingSchema = Yup.InferType<typeof getBookingSchema>['query'];
export type GetMembershipSchema = Yup.InferType<typeof getMembershipSchema>['query'];
export type GetBookingByHotelierSchema = Yup.InferType<
  typeof getBookingByHotelierSchema
>['query'];
