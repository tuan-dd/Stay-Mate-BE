// import Otp, { TypeOtp } from '@/models/Otp';
// import pwdUtil from '@/utils/pwdUtil';
// import { AnyKeys } from 'mongoose';

// class OtpService {
//   static createOtp = async (newOtp: AnyKeys<TypeOtp>) => {
//     const salt = await pwdUtil.getSalt(10);
//     newOtp.sixCode = await pwdUtil.getHash(newOtp.sixCode, salt);
//     return await Otp.create(newOtp);
//   };
//   static findOtps = async (email: string) => {
//     return await Otp.find({ email }).lean().exec();
//   };
// }

// export default OtpService;
