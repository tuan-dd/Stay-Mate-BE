import {
  BadRequestError,
  NotFoundError,
  SuccessResponse,
  ServiceUnavailableError,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { Order, ICart } from '@/models/Cart';
import { CreateCartSchema } from '@/schema/cart.schema';
import cartService from '@/services/cart.service';
import hotelsService from '@/services/hotels.service';
import { Request, Response } from 'express';
import { Types } from 'mongoose';

class CartController {
  createOrAddToCart = async (req: Request<any, any, CreateCartSchema>, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);

    const newOrder: Order = {
      hotelId: new Types.ObjectId(req.body.hotelId),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      rooms: req.body.rooms?.map((room) => ({
        roomTypeId: new Types.ObjectId(room.roomTypeId),
        quantity: room.quantity,
      })),
    };

    // delete order
    if (req.body.isDeleteOrder) {
      const result = await cartService.findOneUpdate(
        { userId },
        {
          $pull: {
            orders: {
              hotelId: newOrder.hotelId,
              startDate: newOrder.startDate,
              endDate: newOrder.endDate,
            },
          },
        },
        { new: true, lean: false },
      );

      if (!result) throw new NotFoundError('Not found cart');
      // no order can not get cart
      if (!result.orders) {
        result.isActive = false;
        await result.save();
      }

      return oke(result);
    }

    // check is have hotel
    const hotelDb = await hotelsService.findOneAndPopulateById(newOrder.hotelId, {
      path: 'roomTypeIds',
      select: 'numberOfRoom nameOfRoom',
    });

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    // check rooms of hotel
    newOrder.rooms.forEach((room) => {
      const isRoomOfHotelDB = hotelDb.roomTypeIds.some((e) => {
        if (e._id.equals(room.roomTypeId)) {
          if (e.numberOfRoom < room.quantity)
            throw new BadRequestError(`order exceed quantity of Room : ${e.nameOfRoom}`);
          return true;
        }
        return false;
      });
      if (!isRoomOfHotelDB) throw new NotFoundError('Not found room of hotel');
    });

    // if user dont have cart create cart
    const cartDb = await cartService.findOne({ userId: userId }, null, { lean: false });

    if (!cartDb) {
      const newCart: ICart = {
        userId,
        orders: [newOrder],
      };
      await cartService.createOne(newCart);

      return oke(newCart);
    }

    // update order if order exist
    const updateCartOfUser = await cartService.findOneUpdate(
      {
        userId,
        'orders.hotelId': newOrder.hotelId,
        'orders.startDate': newOrder.startDate,
        'orders.endDate': newOrder.endDate,
      },
      {
        $set: { 'orders.$': newOrder, isActive: true },
      },
      {
        new: true,
      },
    );

    // if not add order
    if (!updateCartOfUser) {
      cartDb.orders.push(newOrder);

      await cartDb.save();
      return oke(newOrder);
    }

    oke(newOrder);
    function oke(value: Order | ICart) {
      if (!value) throw new ServiceUnavailableError('Update unsuccessfully');
      return new SuccessResponse({
        message: 'Add cart successfully',
        data: value,
      }).send(res);
    }
  };

  getCarts = async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);

    const cartDb = await cartService.findOne({ userId: userId, isActive: true });

    new SuccessResponse({
      message: 'add cart successfully',
      data: cartDb,
    }).send(res);
  };
}

const cartController = new CartController();

export default cartController;
