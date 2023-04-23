import regexUtil from '@/utils/regexUtil';
import * as Yup from 'yup';

export const createUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No update _id'),
    name: Yup.string().required(),
    email: Yup.string().email().required(),
    password: Yup.string()
      .matches(
        regexUtil.PASSWORD_REGEX,
        'Password contain at least one numeric digit, one uppercase and one lowercase letter,min 6 max 20',
      )
      .required(),
    avatar: Yup.string()
      .matches(regexUtil.URL_REGEX, 'Must be url')
      .notRequired(),
  }),
});

export const updateUserSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No update _id'),
    name: Yup.string().notRequired(),
    avatar: Yup.string()
      .matches(regexUtil.URL_REGEX, 'Must be url')
      .notRequired(),
    password: Yup.string().notRequired(),
    newPassword: Yup.string().when('password', (password, field) =>
      password[0]
        ? field
            .matches(
              regexUtil.URL_REGEX,
              'New Password contain at least one numeric digit, one uppercase and one lowercase letter, min 6 max 20',
            )
            .notOneOf(
              [Yup.ref('password'), null],
              'New password must same password',
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

export type CreateUserSchema = Yup.InferType<typeof createUserSchema>['body'];
export type UpdateUserSchema = Yup.InferType<typeof updateUserSchema>['body'];
