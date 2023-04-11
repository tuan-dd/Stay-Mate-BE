// import { Types, Schema, model, SchemaTypes } from 'mongoose';

// export interface TypeOtp {
//   email: string;
//   sixCode: string;
//   expires?: Date;
// }

// const otpSchema = new Schema<TypeOtp>({
//   email: {
//     type: String,
//     required: true,
//   },
//   sixCode: {
//     type: String,
//     required: true,
//   },
//   expires: {
//     type: Date,
//     default: Date.now,
//     index: { expires: 50 },
//   },
// });

// const Otp = model<TypeOtp>('Otps', otpSchema);
// export default Otp;
