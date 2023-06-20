import {
  BadRequestError,
  NotFoundError,
  SuccessResponse,
  ServiceUnavailableError,
} from '@/helpers/utils';
import { ICart } from '@/models/Cart';
import { Package } from '@/models/Hotel';
import { CreateCartSchema } from '@/schema/cart.schema';
import cartService from '@/services/cart.service';
import hotelsService from '@/services/hotels.service';
import dayjs from 'dayjs';
import { Request, Response } from 'express';

class CartController {
  createOrAddToCart = async (req: Request<any, any, CreateCartSchema>, res: Response) => {
    const userId = req.userId;

    const newOrder = cartService.createObjectOrder(req.body);

    // check is have hotel
    const hotelDb = await hotelsService.findOneAndPopulateById(newOrder.hotelId, {
      path: 'roomTypeIds',
      select: 'numberOfRoom nameOfRoom',
    });

    if (!hotelDb && hotelDb.isDelete && hotelDb.package === Package.FREE)
      throw new NotFoundError('Not found hotel');

    // check rooms of hotel
    const roomTypeIds = hotelDb.roomTypeIds.map((room) => room._id);

    newOrder.rooms.forEach((roomOrder) => {
      const index = roomTypeIds.findIndex((e) => e.equals(roomOrder.roomTypeId)); //check have room of hotel
      if (index < 0) throw new NotFoundError('Not found room of hotel');

      if (hotelDb.roomTypeIds[index].numberOfRoom < roomOrder.quantity)
        // check order exceed number Of Room
        throw new BadRequestError(
          `Order exceed quantity of Room : ${hotelDb.roomTypeIds[index].nameOfRoom}`,
        );
    });

    // if user don't have cart create cart
    const cartDb = await cartService.findOne({ userId: userId }, null, { lean: false });

    if (!cartDb) {
      newOrder.createdAt = new Date();
      const newCart: ICart = {
        userId,
        orders: [newOrder],
      };
      await cartService.createOne(newCart);

      return oke(newCart);
    }

    const orderIndex = cartDb.orders.findIndex((order) => {
      let isSameCreatedAt = true;
      const isSameStartDate = dayjs(newOrder.startDate, 'YYYY-MM-DD').isSame(
        dayjs(order.startDate).format('YYYY-MM-DD'),
        'day',
      );

      const isSameEndDate = dayjs(newOrder.endDate, 'YYYY-MM-DD').isSame(
        dayjs(order.endDate).format('YYYY-MM-DD'),
        'day',
      );

      if (req.body.createdAt) {
        isSameCreatedAt = dayjs(req.body.createdAt).isSame(order.createdAt);
      }
      const isSameHotelId = order.hotelId.equals(newOrder.hotelId);

      return isSameStartDate && isSameEndDate && isSameHotelId && isSameCreatedAt;
    });

    if (orderIndex > -1) {
      const updateOrder = cartDb.orders[orderIndex];

      const indexRoom = updateOrder.rooms.findIndex((room) =>
        room.roomTypeId.equals(newOrder.rooms[0].roomTypeId),
      );
      if (indexRoom > -1)
        updateOrder.rooms[indexRoom].quantity = newOrder.rooms[0].quantity;

      if (indexRoom === -1) updateOrder.rooms = [...updateOrder.rooms, newOrder.rooms[0]];

      cartDb.orders[orderIndex] = updateOrder;
    }

    if (orderIndex < 0) {
      newOrder.createdAt = new Date();
      cartDb.orders.push(newOrder);
    }
    cartDb.isActive = true;
    await cartDb.save();

    oke(cartDb);

    function oke(value: ICart) {
      if (!value) throw new ServiceUnavailableError('Update unsuccessfully');

      return new SuccessResponse({
        message: 'Add cart successfully',
        data: value,
      }).send(res);
    }
  };

  updateOrder = async (req: Request<any, any, CreateCartSchema>, res: Response) => {
    const userId = req.userId;

    const newOrder = cartService.createObjectOrder(req.body);

    if (!req.body.createdAt) throw new BadRequestError('Must have createdAt element');

    const hotelDb = await hotelsService.findOneAndPopulateById(newOrder.hotelId, {
      path: 'roomTypeIds',
      select: '_id numberOfRoom',
    });

    hotelDb?.roomTypeIds.forEach((roomTypeId) => {
      const index = newOrder.rooms.findIndex((room) =>
        room.roomTypeId.equals(roomTypeId._id),
      );
      if (index < 0) return;
      if (roomTypeId.numberOfRoom < newOrder.rooms[index].quantity)
        throw new BadRequestError('Exceed number of room');
    });

    const cartDb = await cartService.findOne({ userId: userId }, null, { lean: false });

    if (!cartDb && !cartDb.isActive) throw new NotFoundError('Not found cart');

    const orderIndex = cartDb.orders.findIndex(
      (order) =>
        order.hotelId.equals(newOrder.hotelId) &&
        dayjs(req.body.createdAt).isSame(dayjs(order.createdAt), 'day'),
    );

    if (orderIndex < 0) throw new NotFoundError('Not found order');

    cartDb.orders[orderIndex] = newOrder;
    await cartDb.save();

    new SuccessResponse({
      message: 'Update order successfully',
    }).send(res);
  };

  getCarts = async (req: Request, res: Response) => {
    const userId = req.userId;

    const cartDb = await cartService.findOneAndPopulateByQuery(
      {
        userId: userId,
        isActive: true,
      },
      {
        path: 'orders.hotelId',
        select: 'hotelName country city star starRating isDelete package',
      },
      { path: 'orders.rooms.roomTypeId', select: 'price nameOfRoom numberOfRoom' },
    );

    new SuccessResponse({
      message: 'Add cart successfully',
      data: cartDb,
    }).send(res);
  };

  deleteOrder = async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!req.query.createdAt) throw new BadRequestError('Query must have createdAt');

    const isDate = dayjs(req.query.createdAt as string).isValid();

    if (!isDate) throw new BadRequestError('createdAt is Date');

    const result = await cartService.findOneUpdate(
      { userId },
      {
        $pull: {
          orders: {
            createdAt: req.query.createdAt,
          },
        },
      },
      { new: true, lean: false },
    );

    if (!result) throw new NotFoundError('Not found cart');
    // no order can not get cart
    if (!result.orders.length) {
      result.isActive = false;
      await result.save();
    }

    new SuccessResponse({
      message: 'Delete cart successfully',
    }).send(res);
  };
}

const cartController = new CartController();

export default cartController;
