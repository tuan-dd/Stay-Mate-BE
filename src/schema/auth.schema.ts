import * as Yup from 'yup';

export const signinSchema = Yup.object().shape({
  body: Yup.object().shape({
    email: Yup.string().email().required(),
    password: Yup.string().required(),
  }),
});

export const forgetPwdSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'no update _id'),
    email: Yup.string().email().required(),
    password: Yup.string().required(),
    newPwd: Yup.string()
      .notOneOf(
        [Yup.ref('password'), null],
        'New Password must not same old password',
      )
      .required(),
    confirmPwd: Yup.string()
      .oneOf([Yup.ref('newPwd')], 'New Password must same password')
      .required(),
  }),
});

export type SigninSchema = Yup.InferType<typeof signinSchema>['body'];
export type ChangePwdSchema = Yup.InferType<typeof forgetPwdSchema>['body'];
