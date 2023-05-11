import Cart, { CartDocument, ICart } from '@/models/Cart';
import BaseService from './base.service';
import { FilterQuery, QueryOptions } from 'mongoose';

class CartService extends BaseService<ICart, CartDocument> {
  constructor() {
    super(Cart);
  }

  deleteOneCart = (query: FilterQuery<CartDocument>, option?: QueryOptions) =>
    this.model.deleteOne(query, option).exec();
}

const cartService = new CartService();

export default cartService;
