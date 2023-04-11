import { Types, Schema, model, SchemaTypes } from 'mongoose';
import { number } from 'yup';

// RoomType
interface TypeRoom {
  roomAmenities: string;
  nameOfRoom: string;
  rateDescription: string;
  price: number;
  priceDiscount: number;
  discount: number;
  rateType: number;
  mealType: string;
  taxType: string;
  images: string[];
  numberOfRoom: number;
}

/**
   room_discount
    room_type_id
    discount_percent
 */

// const Room = {
//   roomName: '503',
//   hotelId: "",
//   status: 'active | inactive',
//   roomTypeId: 1
// };

// const RoomBooking = {

// }

// TODO rename
const roomTypeSchema = new Schema<TypeRoom>(
  {
    roomAmenities: {
      type: String,
      required: true,
    },
    nameOfRoom: {
      type: String, //
      required: true,
    },
    rateDescription: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    priceDiscount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    rateType: {
      type: Number,
      required: true,
    },
    mealType: {
      type: String,
    },
    taxType: {
      type: String,
    },
    numberOfRoom: {
      type: Number,
      required: true,
      min: 1,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true },
);

const RoomType = model<TypeRoom>('RoomTypes', roomTypeSchema);
export default RoomType;
