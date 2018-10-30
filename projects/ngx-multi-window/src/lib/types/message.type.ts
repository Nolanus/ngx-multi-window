export enum MessageType {
  MESSAGE,
  MESSAGE_RECEIVED,
  PING
}

export interface MessageTemplate {
  recipientId: string;
  type: MessageType;
  event: string;
  data?: any;
  payload?: any;
}

export interface Message extends MessageTemplate {
  send?: boolean;
  messageId: string;
  sendTime: number;
  senderId: string;
}
