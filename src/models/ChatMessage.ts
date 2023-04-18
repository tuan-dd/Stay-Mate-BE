import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface IChatMessage {
  content?: string;
  chatBoxId?: Types.ObjectId;
  senderId?: Types.ObjectId;
}

/// advance update img

const chatMessageSchema = new Schema<IChatMessage>(
  {
    content: {
      type: String,
      minlength: 1,
      required: true,
    },
    chatBoxId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'BoxChats',
    },
    senderId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'Users',
    },
  },
  { timestamps: true, collection: 'chatMessages' },
);

//Export the model
const ChatMessage = model<IChatMessage>('chatMessages', chatMessageSchema);

export default ChatMessage;
