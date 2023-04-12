import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface TypeBoxChat {
  userCreateId?: Types.ObjectId;
  userTwoId?: Types.ObjectId;
  messageIds?: Types.ObjectId[];
}

const chatBoxSchema = new Schema<TypeBoxChat>(
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
  { timestamps: true },
);

const BoxChat = model<TypeBoxChat>('boxChats', chatBoxSchema);

export default BoxChat;
