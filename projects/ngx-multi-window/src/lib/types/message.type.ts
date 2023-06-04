export enum MessageType {
  WINDOW_CREATED,
  WINDOW_KILLED,
  REPORT_WINDOW,
  CHANGE_NAME,
  REQUEST_ALL_WINDOWS,
  SPECIFIC_WINDOW,
  SPECIFIC_LISTENER,
  ALL_LISTENERS
}

export enum EventType {
  CUSTOM_EVENT,
  INTERNAL
}

export interface MessageTemplate {
  recipientId?: string;
  type: MessageType;
  event: EventType;
  data?: any;
}

export interface Message extends MessageTemplate {
  senderId: string;
  senderName: string;
}
