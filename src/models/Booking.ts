import { Types, Schema, model, SchemaTypes, Document, PopulatedDoc } from 'mongoose';
import { RoomDocument } from './Room-type';

export enum Status {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  STAY = 'STAY',
  DECLINE = 'DECLINE',
  CANCEL = 'CANCEL',
}

interface Room {
  roomTypeId: PopulatedDoc<Document<Types.ObjectId> & RoomDocument>;
  quantity: number;
}
export interface IBooking {
  total?: number;
  status?: Status;
  rooms: Room[];
  userId: Types.ObjectId;
  hotelId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
}

export interface BookingDocument extends IBooking, Document {
  createdAt: Date;
  updatedAt: Date;
}

// cần thêm startDate, endDate
const bookingSchema = new Schema<IBooking>(
  {
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: Status.PENDING,
      enum: Object.values(Status),
      required: true,
    },
    rooms: [
      {
        roomTypeId: {
          type: SchemaTypes.ObjectId,
          required: true,
          ref: 'roomTypes',
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    userId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'users',
    },
    hotelId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'hotels',
    },
  },
  { timestamps: true, collection: 'booking' },
);

const Booking = model<IBooking>('booking', bookingSchema);
export default Booking;
