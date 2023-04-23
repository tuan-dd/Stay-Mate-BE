import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface IBoxChat {
  userCreateId?: Types.ObjectId;
  userTwoId?: Types.ObjectId;
  messageIds?: Types.ObjectId[];
}

const chatBoxSchema = new Schema<IBoxChat>(
  {
    userCreateId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'users',
    },
    userTwoId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'users',
    },
    messageIds: [
      {
        type: SchemaTypes.ObjectId,
        required: true,
        ref: 'chatMessages',
      },
    ],
  },
  { timestamps: true, collection: 'boxChats' },
);

const BoxChat = model<IBoxChat>('boxChats', chatBoxSchema);

export default BoxChat;
