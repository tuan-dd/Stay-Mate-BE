import { NotAuthorizedError, NotFoundError, SuccessResponse } from '@/helpers/utils';
import { Role, UserDocument } from '@/models/User';
import {
  QueryUserSchema,
  UpdateHotelByAdminSchema,
  UpdateUserByAdminSchema,
} from '@/schema/admin.schema';
import hotelsService from '@/services/hotels.service';
import userService from '@/services/user.service';
import { getConvertCreatedAt, getDeleteFilter } from '@/utils/lodashUtil';
import { Request, Response } from 'express';
import { FilterQuery, Types } from 'mongoose';

class AdminController {
  queryUsers = async (req: Request<any, any, any, QueryUserSchema>, res: Response) => {
    let query: FilterQuery<UserDocument> = getDeleteFilter(['page,limit'], req.query);
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    query = getConvertCreatedAt(query, ['name']);

    const users = await userService.findMany(
      {
        query,
        page,
        limit,
      },
      { password: 0 },
    );

    if (!users) throw new NotAuthorizedError('Not found user');

    new SuccessResponse({
      message: 'Get user`s data successfully',
      data: users,
    }).send(res);
  };

  detailUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const userDb = await userService.findById(id);

    if (userDb.role === Role.HOTELIER) {
      const userDbByAggregate = await userService.findUserByAggregate(id, {
        password: 0,
      });
      oke(userDbByAggregate);
    }

    if (userDb.role === Role.USER) {
      const userDbByFindOne = await userService.findById(id, { password: 0 });
      oke(userDbByFindOne);
    }

    function oke(value) {
      if (!value) throw new NotFoundError('Not found user');

      new SuccessResponse({
        message: 'Get user data successfully',
        data: value,
      }).send(res);
    }
  };

  updateHotelByAdmin = async (
    req: Request<any, any, UpdateHotelByAdminSchema>,
    res: Response,
  ) => {
    const hotelId = new Types.ObjectId(req.params.id);

    const newUpdate = await hotelsService.findOneUpdate(
      {
        _id: hotelId,
      },
      { $set: { isdDelete: req.body.isDelete } },
      { new: true },
    );

    if (!newUpdate) throw new NotFoundError('Not found hotel');

    new SuccessResponse({
      message: 'update by admin successfully',
      data: newUpdate,
    }).send(res);
  };

  updateByAdmin = async (
    req: Request<any, any, UpdateUserByAdminSchema>,
    res: Response,
  ) => {
    const userId = req.params.id;
    const isActive = req.body.isActive;

    const userDb = await userService.findById(userId, { lean: false });

    if (!userDb) throw new NotFoundError('Not found user');

    userDb.isActive = isActive;

    await userDb.save();

    new SuccessResponse({
      message: 'charge user successfully',
    }).send(res);
  };
}
const adminController = new AdminController();

export default adminController;
