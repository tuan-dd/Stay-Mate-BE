/* eslint-disable @typescript-eslint/naming-convention */
import {
  BadRequestError,
  CreatedResponse,
  NotAuthorizedError,
  NotFoundError,
} from '@/helpers/utils';
import { EKeyHeader } from '@/middleware/validate';
import { IReview, ReviewDocument } from '@/models/Review';
import {
  CreateReviewSchema,
  GetReviewsByHotelierSchema,
  GetReviewsByUserSchema,
  GetReviewsSchema,
  UpdateReviewSchema,
} from '@/schema/review.schema';
import hotelsService from '@/services/hotels.service';
import reviewService from '@/services/review.service';
import userService from '@/services/user.service';
import {
  Pros,
  convertStringToObjectId,
  deleteKeyUndefined,
  getDeleteFilter,
} from '@/utils/otherUtil';
import { Response, Request } from 'express';
import { Types } from 'mongoose';

class ReviewController {
  /**
   * @check hotelDb check id có tìm dc Hotel
   * @check do review được tạo trước ở bullmq nên tìm kiếm review nếu k có đã quá hạn để review
   * @check check nếu chủ ks k được tạo reviews
   * @check nếu rely thi chu mới được tao
   */

  createReview = async (req: Request<any, any, CreateReviewSchema>, res: Response) => {
    const authorId = req.userId;
    const newReview = {
      context: req.body.context,
      images: req.body.images,
      starRating: req.body.starRating,
    };
    const parent_slug = req.body.parent_slug;
    const hotelId = convertStringToObjectId(req.body.hotelId);

    const hotelDb = await hotelsService.findOne({ _id: hotelId }, null, {
      lean: false,
    });

    const isOwnerHotel = hotelDb.userId.equals(authorId);

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    const reviewDb = await reviewService.findById(req.params.id, null, { lean: false });

    // create review
    if (!parent_slug) {
      if (reviewDb.starRating > 0) throw new NotAuthorizedError('Review has already');

      if (!reviewDb) throw new NotAuthorizedError('User have already expired reviews');

      if (isOwnerHotel)
        throw new NotAuthorizedError('Hotelier can`t not review your hotel');

      Object.keys(newReview).forEach((key) => {
        if (newReview[key]) {
          reviewDb[key] = newReview[key];
        }
      });

      await reviewDb.save();

      const countReview = hotelDb.starRating.countReview + 1;

      const starAverage =
        (hotelDb.starRating.starAverage * hotelDb.starRating.countReview +
          Number(newReview.starRating)) /
        countReview;

      hotelDb.starRating = {
        countReview,
        starAverage,
      };

      await hotelDb.save();

      oke(reviewDb);
    }

    // create reply
    if (parent_slug) {
      const createReply = await this.createReply(
        isOwnerHotel,
        parent_slug,
        reviewDb,
        authorId,
        newReview,
      );
      oke(createReply);
    }

    function oke(value: IReview) {
      if (!value) throw new NotFoundError('Not Found reviews');
      return new CreatedResponse({
        message: 'Create review or reply successfully',
        data: value,
      }).send(res);
    }
  };

  createReply = async (
    isOwnerHotel: boolean,
    parent_slug: string,
    reviewDb: ReviewDocument,
    authorId: string | any,
    newReview: CreateReviewSchema,
  ) => {
    //check nếu chủ ks k được tạo reply
    if (!isOwnerHotel) throw new NotAuthorizedError('Only hotelier can reply review ');

    if (parent_slug !== reviewDb.slug) throw new BadRequestError('Wrong parent slug');

    //mỗi review chỉ tạo 1 reply
    if (reviewDb.isReply) throw new BadRequestError('Review has already reply');

    const replyReview: Pros<IReview> = getDeleteFilter(
      ['_id', 'createdAt', 'updatedAt', 'images'],
      reviewDb,
    );

    const hotelier = await userService.findById(authorId);

    replyReview.parent_slug = parent_slug;

    replyReview.author = {
      authorId: authorId,
      name: hotelier.name,
      role: hotelier.role,
    };

    replyReview.slug = `${reviewDb.slug}/${new Date().getTime().toString()}`;

    replyReview.isReply = true;
    replyReview.context = newReview.context;
    replyReview.starRating = newReview.starRating;

    const createReply = await reviewService.createOne(replyReview);

    reviewDb.isReply = true;
    await reviewDb.save();
    return createReply;
  };

  updateReview = async (req: Request<any, any, UpdateReviewSchema>, res: Response) => {
    /**
     * @check 'author.authorId' thì mới được sửa
     * @check có review
     */

    const newUpdate: Pros<UpdateReviewSchema> = deleteKeyUndefined(req.body);

    if (req.body.isDelete) {
      const result = this.deleteReview(newUpdate._id, req.userId);
      return oke(result);
    }

    const result = await reviewService.findOneUpdate(
      {
        _id: convertStringToObjectId(req.params.id),
        'author.authorId': convertStringToObjectId(
          req.headers[EKeyHeader.USER_ID] as string,
        ),
        starRating: { $ne: 0 },
      },
      { $set: newUpdate },
      { new: false },
    );

    if (!result.parent_slug && newUpdate.starRating !== result.starRating) {
      const hotelDb = await hotelsService.findById(result.hotel.hotelId, null, {
        lean: false,
      });

      const newStarAverage =
        (hotelDb.starRating.starAverage * hotelDb.starRating.countReview -
          result.starRating +
          Number(newUpdate.starRating)) /
        hotelDb.starRating.countReview;

      hotelDb.starRating = {
        ...hotelDb.starRating,
        starAverage: newStarAverage,
      };

      await hotelDb.save();
    }

    return oke(result);

    function oke(value) {
      if (!value) throw new NotFoundError('Not found review');
      new CreatedResponse({ message: ' Update Review successfully' }).send(res);
    }
  };

  deleteReview = async (reviewId: string, userId: Types.ObjectId) => {
    const result = await reviewService.findOneUpdate(
      {
        _id: convertStringToObjectId(reviewId),
        'author.authorId': userId,
        starRating: { $ne: 0 },
      },
      { $set: { isDelete: true } },
      { new: false },
    );

    if (!result.parent_slug) {
      const hotelDb = await hotelsService.findById(result.hotel.hotelId, null, {
        lean: false,
      });

      const countReview = hotelDb.starRating.countReview - 1;

      let newStarAverage: number;

      if (countReview === 0) {
        newStarAverage = 5;
      } else {
        newStarAverage =
          (hotelDb.starRating.starAverage * hotelDb.starRating.countReview -
            result.starRating) /
          countReview;
      }

      hotelDb.starRating = {
        countReview,
        starAverage: newStarAverage,
      };

      await hotelDb.save();
      return result;
    }
  };

  getReviewsByUser = async (
    req: Request<any, any, any, GetReviewsByUserSchema>,
    res: Response,
  ) => {
    const { isReview } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const userId = req.userId;
    let reviews = [];
    let count = 0;
    const query = {
      'author.authorId': userId,
      parent_slug: '',
      starRating: null,
    };

    if (Object.keys(req.query).every((key) => !req.query[key]))
      throw new BadRequestError('Request must have one value');

    if (isReview) {
      query.starRating = { $gte: 0.5 };

      reviews = await reviewService.findMany({ query, page, limit });

      count = await reviewService.getCountByQuery(query);

      return oke();
    }

    if (!isReview) {
      query.starRating = 0;

      reviews = await reviewService.findMany({ query, page, limit });

      count = await reviewService.getCountByQuery(query);

      return oke();
    }

    function oke() {
      if (!reviews.length) throw new NotFoundError('Not found reviews');

      new CreatedResponse({
        message: 'Get Data`reviews successfully',
        data: {
          reviews,
          count,
        },
      }).send(res);
    }
  };

  getReviewsByHolier = async (
    req: Request<any, any, any, GetReviewsByHotelierSchema>,
    res: Response,
  ) => {
    const { typeReview, hotelId } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const userId = req.userId;
    let countReview = 0;

    const hotelDb = await hotelsService.findById(hotelId);

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    if (!hotelDb.userId.equals(userId))
      throw new NotAuthorizedError('Only hotelier can get hotel`s review');

    const query = {
      'hotel.hotelId': hotelDb._id,
      parent_slug: null,
      isReply: true,
      starRating: { $ne: 0 },
    };

    if (typeReview === 'reply') {
      query.parent_slug = { $ne: '' };

      delete query.starRating;

      const reviewDb = await reviewService.findMany({ query, page, limit });

      countReview = await reviewService.getCountByQuery(query);

      return oke(reviewDb);
    }

    if (typeReview === 'reviewHadReply') {
      delete query.starRating;
      delete query.parent_slug;

      const reviewDb = await reviewService.findMany({ query, page, limit });

      countReview = await reviewService.getCountByQuery(query);

      return oke(reviewDb);
    }

    if (typeReview === 'reviewNoReply') {
      query.parent_slug = '';
      query.isReply = false;

      const reviewDb = await reviewService.findMany({ query, page, limit });

      countReview = await reviewService.getCountByQuery(query);

      return oke(reviewDb);
    }

    function oke(reviews: IReview[]) {
      if (!reviews.length) throw new NotFoundError('Not found reviews');
      new CreatedResponse({
        message: ' get Data`review successfully',
        data: { reviews, count: countReview },
      }).send(res);
    }
  };

  getReviews = async (req: Request<any, any, any, GetReviewsSchema>, res: Response) => {
    const { hotelId, parent_slug } = req.query;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    let reviews: [] | object;

    if (Object.keys(req.query).every((key) => !req.query[key]))
      throw new BadRequestError('Request must have one value');

    if (parent_slug) {
      const regex = new RegExp(parent_slug, 'i');

      reviews = await reviewService.findOne({ slug: regex, parent_slug: { $ne: '' } });

      return oke();
    }

    if (!parent_slug) {
      reviews = await reviewService.findMany({
        query: {
          'hotel.hotelId': hotelId,
          parent_slug: '',
          starRating: { $gte: 0.5 },
        },
        page,
        limit,
      });
      return oke();
    }

    function oke() {
      if (!reviews) throw new NotFoundError('Not found reviews');
      new CreatedResponse({
        message: ' Get Data`s review successfully',
        data: reviews,
      }).send(res);
    }
  };
}

const reviewController = new ReviewController();

export default reviewController;
