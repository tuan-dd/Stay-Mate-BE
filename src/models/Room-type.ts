import { Types, Schema, model, SchemaTypes, Document } from 'mongoose';
import { number } from 'yup';

// RoomType
export enum RoomAmenities {
  ADDITIONAL_BATHROOM = 'Additional bathroom',
  ADDITIONAL_TOILET = 'Additional toilet',
  AIR_CONDITIONING = 'Air conditioning',
  AIR_PURIFIER = 'Air purifier',
  ALARM_CLOCK = 'Alarm clock',
  BATHROBES = 'Bathrobes',
  BATHROOM_PHONE = 'Bathroom phone',
  BLACKOUT_CURTAINS = 'Blackout curtains',
  CARBON_MONOXIDE_DETECTOR = 'Carbon monoxide detector',
  CARPETING = 'Carpeting',
  CLEANING_PRODUCTS = 'Cleaning products',
  CLOSET = 'Closet',
  CLOTHES_DRYER = 'Clothes dryer',
  CLOTHES_RACK = 'Clothes rack',
  COFFEE_TEA_MAKER = 'Coffee/tea maker',
  COMPLIMENTARY_TEA = 'Complimentary tea',
  DVD_CD_PLAYER = 'DVD/CD player',
  DAILY_HOUSEKEEPING = 'Daily housekeeping',
  DAILY_NEWSPAPER = 'Daily newspaper',
  DART_BOARD = 'Dart board',
  DESK = 'Desk',
  DISHWASHER = 'Dishwasher',
  DRESSING_ROOM = 'Dressing room',
  ELECTRIC_BLANKET = 'Electric blanket',
  EXTRA_LONG_BED = 'Extra long bed',
  FAN = 'Fan',
  FIRE_EXTINGUISHER = 'Fire extinguisher',
  FIREPLACE = 'Fireplace',
  FIRST_AID_KIT = 'First aid kit',
  FREE_WI_FI_IN_ALL_ROOMS = 'Free Wi-Fi in all rooms!',
  FREE_BOTTLED_WATER = 'Free bottled water',
  FREE_INSTANT_COFFEE = 'Free instant coffee',
  FREE_WELCOME_DRINK = 'Free welcome drink',
  FULL_KITCHEN = 'Full kitchen',
  HAIR_DRYER = 'Hair dryer',
  HEATING = 'Heating',
  HIGH_CHAIR = 'High chair',
  HIGH_FLOOR = 'High floor',
  HOT_TUB = 'Hot tub',
  HUMIDIFIER = 'Humidifier',
  IN_ROOM_SAFE_BOX = 'In-room safe box',
  IN_ROOM_TABLET = 'In-room tablet',
  INTERCONNECTING_ROOMS_AVAILABLE = 'Interconnecting room(s) available',
  INTERNET_ACCESS_WIRELESS = 'Internet access – wireless',
  IRONING_FACILITIES = 'Ironing facilities',
  KITCHEN = 'Kitchen',
  KITCHENWARE = 'Kitchenware',
  LAPTOP_SAFE_BOX = 'Laptop safe box',
  LAPTOP_WORKSPACE = 'Laptop workspace',
  LINENS = 'Linens',
  LOCKER = 'Locker',
  MICROWAVE = 'Microwave',
  MINI_BAR = 'Mini bar',
  MIRROR = 'Mirror',
  MOSQUITO_NET = 'Mosquito net',
  ON_DEMAND_MOVIES = 'On-demand movies',
  PETS_ALLOWED_IN_ROOM = 'Pets allowed in room',
  PRIVATE_ENTRANCE = 'Private entrance',
  REFRIGERATOR = 'Refrigerator',
  SATELLITE_CABLE_CHANNELS = 'Satellite/cable channels',
  SCALE = 'Scale',
  SEATING_AREA = 'Seating area',
  SEPARATE_DINING_AREA = 'Separate dining area',
  SEPARATE_LIVING_ROOM = 'Separate living room',
  SEWING_KIT = 'Sewing kit',
  SHOESHINE_KIT = 'Shoeshine kit',
  SHOWER = 'Shower',
  SLIPPERS = 'Slippers',
  SMOKE_DETECTOR = 'Smoke detector',
  SOFA = 'Sofa',
  SOUNDPROOFING = 'Soundproofing',
  TV = 'TV',
  TV_FLAT_SCREEN = 'TV [flat screen]',
  TV_IN_BATHROOM = 'TV [in bathroom]',
  TELEPHONE = 'Telephone',
  TOILETRIES = 'Toiletries',
  TOWELS = 'Towels',
  TROUSER_PRESS = 'Trouser press',
  UMBRELLA = 'Umbrella',
  VENDING_MACHINE = 'Vending machine',
  VIDEO_GAME_CONSOLE = 'Video game console',
  WAKE_UP_SERVICE = 'Wake-up service',
  WASHING_MACHINE = 'Washing machine',
  WHIRLPOOL_BATHTUB = 'Whirlpool bathtub',
  WI_FI_CHARGES_APPLY = 'Wi-Fi [charges apply]',
  WI_FI_FREE = 'Wi-Fi [free]',
  WIFI_PUBLIC_AREAS = 'Wi-Fi in public areas',
  WOODEN_PARQUETED_FLOORING = 'Wooden/parqueted flooring',
  IPOD_DOCKING_STATION = 'iPod docking station',
}
export interface TypeRoom {
  roomAmenities: RoomAmenities[];
  nameOfRoom: string;
  rateDescription: string;
  price: number;
  priceDiscount?: number;
  discount?: number;
  mealType?: string;
  taxType?: string;
  images: string[];
  numberOfRoom: number;
}

export interface RoomDocument extends TypeRoom, Document {
  createdAt: Date;
  updatedAt: Date;
}
const roomTypeSchema = new Schema<TypeRoom>(
  {
    roomAmenities: [
      {
        type: String,
        required: true,
        enum: Object.values(RoomAmenities),
      },
    ],
    nameOfRoom: {
      type: String, //
      required: true,
    },
    rateDescription: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    priceDiscount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    mealType: {
      type: String,
    },
    taxType: {
      type: String,
    },
    numberOfRoom: {
      type: Number,
      required: true,
      min: 1,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true, collection: 'roomTypes' },
);

const RoomType = model<TypeRoom>('roomTypes', roomTypeSchema);
export default RoomType;
