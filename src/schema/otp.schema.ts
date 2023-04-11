import * as Yup from 'yup';

export const otpSchema = Yup.object().shape({
  body: Yup.object().shape({
    email: Yup.string().email().required(),
    sixCode: Yup.number().min(100_000).max(999_999),
  }),
});

export type OtpSchema = Yup.InferType<typeof otpSchema>['body'];
