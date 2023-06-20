import Cart, { CartDocument, ICart, Order } from '@/models/Cart';
import BaseService from './base.service';
import { FilterQuery, PopulateOptions, QueryOptions } from 'mongoose';
import { convertDate, convertStringToObjectId } from '@/utils/otherUtil';
import { CreateBookingSchema } from '@/schema/payment.schema';

class CartService extends BaseService<ICart, CartDocument> {
  constructor() {
    super(Cart);
  }

  createObjectOrder = (newOrder: CreateBookingSchema): Order => ({
    hotelId: convertStringToObjectId(newOrder.hotelId),
    startDate: convertDate(newOrder.startDate),
    endDate: convertDate(newOrder.endDate),
    createdAt: newOrder.createdAt,
    rooms: newOrder.rooms?.map((room) => ({
      roomTypeId: convertStringToObjectId(room.roomTypeId),
      quantity: room.quantity,
    })),
  });

  findOneAndPopulateByQuery = (
    query: FilterQuery<CartDocument>,
    options1?: PopulateOptions,
    options2?: PopulateOptions,
  ) => {
    return this.model
      .findOne(query)
      .populate({
        path: 'orders.hotelId',
        ...options1,
      })
      .populate({ path: 'orders.rooms.roomTypeId', ...options2 })
      .lean()
      .exec();
  };

  deleteOneCart = (query: FilterQuery<CartDocument>, option?: QueryOptions) =>
    this.model.deleteOne(query, option).exec();
}

const cartService = new CartService();

export default cartService;
