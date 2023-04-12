import { Types, Schema, model, SchemaTypes } from 'mongoose';

export enum Status {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  STAY = 'STAY',
  DECLINE = 'DECLINE',
  CANCEL = 'CANCEL',
}

interface Room {
  roomTypeId: Types.ObjectId;
  quantity: number;
}
interface TypeBooking {
  total: number;
  status: Status;
  rooms: Room[];
  userId?: Types.ObjectId;
  hotelId?: Types.ObjectId;
  startDate: Date;
  endDate: Date;
}

// cần thêm startDate, endDate
const bookingSchema = new Schema<TypeBooking>(
  {
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: Status.PENDING,
      enum: Object.values(Status),
    },
    rooms: [
      {
        roomTypeId: {
          type: SchemaTypes.ObjectId,
          required: true,
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
  { timestamps: true },
);

const Booking = model<TypeBooking>('books', bookingSchema);
export default Booking;
