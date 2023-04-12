import { CurrencyCode } from '@/utils/currencyCode';
import { Types, Schema, model, SchemaTypes } from 'mongoose';

export enum PropertyType {
  HOTEL = 'hotel',
  HOLIDAY_PARKS = 'holiday_parks',
}

export enum Package {
  FREE = 'FREE',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

interface TypeHotel {
  hotelName: string;
  images: string[];
  address: string;
  city: string;
  country: string;
  zipCode: number;
  propertyType: PropertyType;
  star: number;
  starRating: number;
  latitude: number;
  longitude: number;
  currency: CurrencyCode;
  package: Package;
  userId: Types.ObjectId;
  roomTypeIds: Types.ObjectId[];
}

const hotelSchema = new Schema<TypeHotel>(
  {
    hotelName: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        required: true,
        max: 3,
      },
    ],
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
    },
    zipCode: {
      type: Number,
      required: true,
      min: 999,
    },
    propertyType: {
      type: String,
      required: true,
      enum: Object.values(PropertyType),
    },
    star: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    starRating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: +180,
    },
    currency: {
      type: String,
      enum: Object.values(CurrencyCode),
    },
    package: {
      type: String,
      default: Package.FREE,
      require: true,
      enum: Object.values(Package),
    },
    roomTypeIds: [
      {
        type: SchemaTypes.ObjectId,
        ref: 'roomTypes',
        min: 1,
        required: true,
      },
    ],
    userId: {
      type: SchemaTypes.ObjectId,
      ref: 'users',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Hotel = model<TypeHotel>('hotels', hotelSchema);
export default Hotel;
