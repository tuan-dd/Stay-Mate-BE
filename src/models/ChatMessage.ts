import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface TypeChatMessage {
  content?: string;
  chatBoxId?: Types.ObjectId;
  senderId?: Types.ObjectId;
}

/// advance update img

const chatMessageSchema = new Schema<TypeChatMessage>(
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
  { timestamps: true },
);

//Export the model
const ChatMessage = model<TypeChatMessage>('chatMessages', chatMessageSchema);

export default ChatMessage;
