import { Role } from '@/models/User';
import { URL_REGEX } from '@/utils/regexUrl';
import * as Yup from 'yup';

const passwordRegExp = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

export const createUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    name: Yup.string().required(),
    email: Yup.string().email().required(),
    password: Yup.string()
      .matches(
        passwordRegExp,
        'Password contain at least one numeric digit, one uppercase and one lowercase letter',
      )
      .required(),
    avatar: Yup.string().matches(URL_REGEX, 'Must be url').notRequired(),
  }),
});

export const updateUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    name: Yup.string().notRequired(),
    avatar: Yup.string().matches(URL_REGEX, 'Must be url').notRequired(),
    password: Yup.string().notRequired(),
    newPassword: Yup.string().when('password', (password, field) =>
      password[0]
        ? field
            .notOneOf([Yup.ref('password'), null])
            .min(6)
            .max(20)
            .matches(
              passwordRegExp,
              'Password contain at least one numeric digit, one uppercase and one lowercase letter',
            )
            .required()
        : field.max(
            0,
            'Not input value because you don`t input current password',
          ),
    ),
    confirmPassword: Yup.string().when('newPassword', (newPassword, field) =>
      newPassword[0]
        ? field
            .oneOf([Yup.ref('newPassword')], 'not match new password')
            .required()
        : field.max(0, 'Not input value because you don`t input newPassword '),
    ),
  }),
});

export const updateUserSchemaByAdmin = Yup.object().shape({
  body: Yup.object().shape({
    isActive: Yup.boolean().required(),
  }),
});

export const chargeSchema = Yup.object().shape({
  body: Yup.object().shape({
    balance: Yup.number().required(),
  }),
});

export const verifyUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    sixCode: Yup.boolean().required(),
  }),
});

export const queryUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    email: Yup.string().email().notRequired(),
    name: Yup.string().notRequired(),
    role: Yup.string().oneOf(Object.values(Role)).notRequired(),
    createdAt_gte: Yup.date().max(new Date()).notRequired(),
    createdAt_lte: Yup.date().min('2023-04-06').notRequired(),
    createdAt: Yup.date()
      .when(['createdAt_gte', 'createdAt_lte'], {
        is: (createdAt_gte, createdAt_lte) => createdAt_gte || createdAt_lte,
        then: (field) =>
          field.max(
            0,
            'Cant input the value because you had value createdAt_gte or createdAt_lte ',
          ),
      })
      .notRequired(),
    page: Yup.number().integer().negative().min(1).notRequired(),
  }),
});

export type CreateUserSchema = Yup.InferType<typeof createUserSchema>['body'];
export type UpdateUserSchema = Yup.InferType<typeof updateUserSchema>['body'];
export type UpdateUserSchemaByAdmin = Yup.InferType<
  typeof updateUserSchemaByAdmin
>['body'];
export type ChargeSchema = Yup.InferType<typeof chargeSchema>['body'];
export type VerifyUserSchema = Yup.InferType<typeof verifyUserSchema>['body'];
export type QueryUserSchema = Yup.InferType<typeof queryUserSchema>['body'];
