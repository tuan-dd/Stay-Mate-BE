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
      ref: 'Users',
    },
    userTwoId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'Users',
    },
    messageIds: [
      {
        type: SchemaTypes.ObjectId,
        required: true,
        ref: 'ChatMessages',
      },
    ],
  },
  { timestamps: true },
);

const BoxChat = model<TypeBoxChat>('BoxChats', chatBoxSchema);

export default BoxChat;
