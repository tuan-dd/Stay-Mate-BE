import { Types } from 'mongoose';

export enum EJob {
  BOOKING_DECLINE = 'bookingPayment',
  BOOKING_STAY = 'bookingStay',
  MEMBERSHIP = 'membership',
  DELETE_REVIEW = 'delete_review',
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
export interface IDelete_reviewJob {
  type: EJob.DELETE_REVIEW;
  data: {
    id: string | Types.ObjectId;
  };
}
export type WorkerJob =
  | IBookingPaymentJob
  | IBookingStayedJob
  | IMembershipJob
  | IDelete_reviewJob;
