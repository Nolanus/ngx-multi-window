export enum InternalMessageType {
  /**
   * INTERNAL
   */
  WINDOW_CREATED,
  WINDOW_KILLED,
  REPORT_WINDOW,
  CHANGE_NAME,
  REQUEST_ALL_WINDOWS,
  SPECIFIC_LISTENER
}
export enum MessageType {
  /**
   * EXTERNAL
   */
  SPECIFIC_WINDOW,
  SPECIFIC_LISTENER,
  ALL_LISTENERS
}

export interface InternalMessageTemplate {
  recipientId?: string;
  type: InternalMessageType;
  isInternal: boolean;
  data?: any;
}
export interface MessageTemplate {
  recipientId?: string;
  type: MessageType;
  data?: any;
}

export interface InternalMessage extends InternalMessageTemplate {
  senderId: string;
  senderName: string;
}

export interface Message extends MessageTemplate {
  senderId: string;
  senderName: string;
}
