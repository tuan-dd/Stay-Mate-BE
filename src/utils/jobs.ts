import { Types } from 'mongoose';

export enum EJob {
  BOOKING_DECLINE = 'bookingPayment',
  BOOKING_STAY = 'bookingStay',
  MEMBERSHIP = 'membership',
  DELETE_REVIEW = 'delete_review',
}

export interface IBookingPaymentJob {
  type: EJob.BOOKING_DECLINE;
  job: {
    id: string | Types.ObjectId;
  };
}

export interface IBookingStayedJob {
  type: EJob.BOOKING_STAY;
  job: {
    id: string | Types.ObjectId;
  };
}

export interface IMembershipJob {
  type: EJob.MEMBERSHIP;
  job: {
    id: string | Types.ObjectId;
    userID: string | Types.ObjectId;
  };
}
export interface IDeleteReviewJob {
  type: EJob.DELETE_REVIEW;
  job: {
    id: string | Types.ObjectId;
  };
}
export type WorkerJob =
  | IBookingPaymentJob
  | IBookingStayedJob
  | IMembershipJob
  | IDeleteReviewJob;
