import Cart, { CartDocument, ICart } from '@/models/Cart';
import BaseService from './base.service';
import { FilterQuery, PopulateOptions, QueryOptions } from 'mongoose';

class CartService extends BaseService<ICart, CartDocument> {
  constructor() {
    super(Cart);
  }

  findOneAndPopulateByQuery = (
    query: FilterQuery<CartDocument>,
    options1?: PopulateOptions,
    options2?: PopulateOptions,
  ) => {
    return Cart.findOne(query)
      .populate({
        path: 'orders.hotelId',
        ...options1,
      })
      .populate({ path: 'orders.rooms.roomTypeId', ...options2 })
      .sort('-createdAt')
      .lean()
      .exec();
  };

  deleteOneCart = (query: FilterQuery<CartDocument>, option?: QueryOptions) =>
    this.model.deleteOne(query, option).exec();
}

const cartService = new CartService();

export default cartService;
