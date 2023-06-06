import regexUtil from '@/utils/regexUtil';
import * as Yup from 'yup';

export const createReviewSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No input value'),
    context: Yup.string().min(1).max(500).required(),
    images: Yup.array(Yup.string().matches(regexUtil.URL_REGEX)).notRequired(),
    starRating: Yup.number().min(0.5).max(5).required(),
    parent_slug: Yup.string().notRequired(),
    hotelId: Yup.string().objectIdValid().required(),
  }),
});

export const updateReviewSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No input value'),
    context: Yup.string().min(1).max(500).required(),
    images: Yup.array(Yup.string().matches(regexUtil.URL_REGEX)).notRequired(),
    starRating: Yup.number().min(0.5).max(5).required(),
    isDelete: Yup.boolean().notRequired(),
  }),
});

export const getReviewsByUserSchema = Yup.object().shape({
  query: Yup.object().shape({
    isReview: Yup.boolean().notRequired(),
    page: Yup.number().integer().min(1).notRequired(),
    limit: Yup.number().integer().min(3).max(45).notRequired(),
  }),
});

export const getReviewsByHotelierSchema = Yup.object().shape({
  query: Yup.object().shape({
    typeReview: Yup.string()
      .oneOf(['reviewNoReply', 'reviewHadReply', 'reply'])
      .required(),
    page: Yup.number().integer().min(1).notRequired(),
    limit: Yup.number().integer().min(3).max(45).notRequired(),
    hotelId: Yup.string().objectIdValid().required(),
  }),
});

export const getReviewsSchema = Yup.object().shape({
  query: Yup.object().shape({
    hotelId: Yup.string().objectIdValid().notRequired(),
    parent_slug: Yup.string().notRequired(),
    page: Yup.number().integer().min(1).notRequired(),
    limit: Yup.number().integer().min(3).max(45).notRequired(),
  }),
});

export type CreateReviewSchema = Yup.InferType<typeof createReviewSchema>['body'];

export type UpdateReviewSchema = Yup.InferType<typeof updateReviewSchema>['body'];

export type GetReviewsByUserSchema = Yup.InferType<
  typeof getReviewsByUserSchema
>['query'];

export type GetReviewsByHotelierSchema = Yup.InferType<
  typeof getReviewsByHotelierSchema
>['query'];

export type GetReviewsSchema = Yup.InferType<typeof getReviewsSchema>['query'];
