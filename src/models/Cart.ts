import { Types, Schema, model, SchemaTypes, Document } from 'mongoose';
import { KeyRoomBooking } from './Booking';

export interface Order {
  hotelId: Types.ObjectId;
  endDate: Date;
  startDate: Date;
  rooms: KeyRoomBooking[];
}

export interface ICart {
  userId: Types.ObjectId;
  orders: Order[];
  isActive?: boolean;
}

export interface CartDocument extends ICart, Document {
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    orders: {
      type: [
        {
          hotelId: {
            type: SchemaTypes.ObjectId,
            required: true,
            ref: 'hotels',
          },
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
          rooms: {
            type: [
              {
                roomTypeId: {
                  type: SchemaTypes.ObjectId,
                  required: true,
                  ref: 'roomTypes',
                },
                quantity: {
                  type: Number,
                  min: 1,
                  required: true,
                },
              },
            ],
          },
        },
      ],
      _id: false,
      required: true,
    },
    userId: {
      type: SchemaTypes.ObjectId,
      index: true,
      unique: true,
      required: true,
      ref: 'users',
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, collection: 'carts' },
);

cartSchema.path('orders').validate((val) => val.length <= 20, 'Max orders is 20');

const Cart = model<ICart>('carts', cartSchema);

export default Cart;
