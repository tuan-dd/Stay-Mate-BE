import { Types } from 'mongoose';

export enum EJob {
  BOOKING_DECLINE = 'bookingPayment',
  BOOKING_STAY = 'bookingStay',
  MEMBERSHIP = 'membership',
}

export interface IBookingPaymentJob {
  type: EJob.BOOKING_DECLINE;
  data: {
    id: string | Types.ObjectId;
  };
}

export interface IBookingStayedJob {
  type: EJob.BOOKING_STAY;
  data: {
    id: string | Types.ObjectId;
  };
}

export interface IMembershipJob {
  type: EJob.MEMBERSHIP;
  data: {
    id: string | Types.ObjectId;
  };
}

export type WorkerJob = IBookingPaymentJob | IBookingStayedJob | IMembershipJob;
