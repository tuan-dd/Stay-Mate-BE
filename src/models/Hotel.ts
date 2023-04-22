import { Types, Schema, model, SchemaTypes, Document } from 'mongoose';

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

export enum PricePackage {
  FREE = 0,
  WEEK = 7,
  MONTH = 30,
  YEAR = 365,
}

interface starRating {
  countReview: number;
  starAverage: number;
}
export interface IHotel {
  hotelName: string;
  image?: string;
  address: string;
  city: string;
  country: string;
  zipCode: number;
  propertyType: PropertyType;
  star: number;
  starRating?: starRating;
  latitude?: number;
  longitude?: number;
  package: Package;
  userId: Types.ObjectId;
  roomTypeIds?: Types.ObjectId[];
  isDelete?: boolean;
}

export interface HotelDocument extends IHotel, Document {
  createdAt: Date;
  updatedAt: Date;
}

const hotelSchema = new Schema<IHotel>(
  {
    hotelName: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
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
      default: 5,
      min: 1,
      max: 5,
    },
    starRating: {
      countReview: { type: Number, default: 0, required: true },
      starAverage: { type: Number, default: 5, required: true },
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
    package: {
      type: String,
      default: Package.FREE,
      require: true,
      enum: Object.values(Package),
    },
    roomTypeIds: [
      {
        type: Types.ObjectId,
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
    isDelete: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
    collection: 'hotels',
  },
);

const Hotel = model<IHotel>('hotels', hotelSchema);
export default Hotel;
