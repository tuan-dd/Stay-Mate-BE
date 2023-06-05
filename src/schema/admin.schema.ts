import { ERole } from '@/models/User';
import * as Yup from 'yup';

export const queryUserSchema = Yup.object().shape({
  query: Yup.object().shape({
    email: Yup.string().email().notRequired(),
    name: Yup.string().notRequired(),
    role: Yup.string().oneOf(Object.values(ERole)).notRequired(),
    createdAt_gte: Yup.date().notRequired(),
    createdAt_lte: Yup.date().notRequired(),
    createdAt: Yup.date().when(['createdAt_gte', 'createdAt_lte'], {
      is: (createdAt_gte, createdAt_lte) => createdAt_gte || createdAt_lte,
      then: (field) =>
        field.max(
          0,
          'Cant input the value because you had value createdAt_gte or createdAt_lte ',
        ),
      otherwise: (field) => field.notRequired(),
    }),
    page: Yup.number().integer().min(1).notRequired(),
    limit: Yup.number().integer().min(10).max(30).notRequired(),
  }),
});

export const updateUserByAdminSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No update _id'),
    isActive: Yup.boolean().required(),
  }),
});

export const updateHotelByAdminSchema = Yup.object()
  .shape({
    body: Yup.object()
      .shape({
        _id: Yup.string().max(0, 'No update _id'),
        isDelete: Yup.boolean().required(),
      })
      .noUnknown('Not input other value'),
  })
  .noUnknown('Not input other value');

export type UpdateHotelByAdminSchema = Yup.InferType<
  typeof updateHotelByAdminSchema
>['body'];
export type UpdateUserByAdminSchema = Yup.InferType<
  typeof updateUserByAdminSchema
>['body'];
export type QueryUserSchema = Yup.InferType<typeof queryUserSchema>['query'];
