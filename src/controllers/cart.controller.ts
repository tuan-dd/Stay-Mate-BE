import {
  BadRequestError,
  NotFoundError,
  SuccessResponse,
  ServiceUnavailableError,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { Order, ICart } from '@/models/Cart';
import { Package } from '@/models/Hotel';
import { CreateCartSchema } from '@/schema/cart.schema';
import cartService from '@/services/cart.service';
import hotelsService from '@/services/hotels.service';
import dayjs from 'dayjs';
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
      if (!result.orders.length) {
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

    // newOrder.rooms.forEach((roomOrder) => {
    //   const isRoomOfHotelDB = hotelDb.roomTypeIds.some((e) => { // loop if each roomOrder in newOrder same room in hotel
    //     if (e._id.equals(roomOrder.roomTypeId)) {
    //       if (e.numberOfRoom < roomOrder.quantity) // check order exceed number Of Room
    //         throw new BadRequestError(`order exceed quantity of Room : ${e.nameOfRoom}`);
    //       return true;
    //     }
    //     return false;
    //   });
    //   if (!isRoomOfHotelDB) throw new NotFoundError('Not found room of hotel');
    // });

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

    const orderIndex = cartDb.orders.findIndex((order) => {
      const isSameStartDate = dayjs(newOrder.startDate, 'YYYY-MM-DD').isSame(
        dayjs(order.startDate).format('YYYY-MM-DD'),
        'day',
      );
      const isSameEndDate = dayjs(newOrder.endDate, 'YYYY-MM-DD').isSame(
        dayjs(order.endDate).format('YYYY-MM-DD'),
        'day',
      );
      const isSameHotelId = order.hotelId.equals(newOrder.hotelId);
      return isSameStartDate && isSameEndDate && isSameHotelId;
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

    if (orderIndex < 0) cartDb.orders.push(newOrder);

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

    const cartDb = await cartService.findOne({ userId: userId }, null, { lean: false });

    if (!cartDb && !cartDb.isActive) throw new NotFoundError('Not found cart');

    const orderIndex = cartDb.orders.findIndex((order) => {
      return order.hotelId.equals(newOrder.hotelId);
    });

    if (orderIndex === -1) throw new NotFoundError('Not found order');

    cartDb.orders[orderIndex] = newOrder;
    await cartDb.save();

    new SuccessResponse({
      message: 'Update order successfully',
    }).send(res);
  };

  getCarts = async (req: Request, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);

    const cartDb = await cartService.findOneAndPopulateByQuery(
      {
        userId: userId,
        isActive: true,
      },
      { path: 'orders.hotelId', select: 'hotelName country city star starRating' },
      { path: 'orders.rooms.roomTypeId', select: 'price -_id nameOfRoom' },
    );

    new SuccessResponse({
      message: 'add cart successfully',
      data: cartDb,
    }).send(res);
  };
}

const cartController = new CartController();

export default cartController;
