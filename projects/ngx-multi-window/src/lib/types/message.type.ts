export enum InternalMessageType {
  /**
   * INTERNAL
   */
  WINDOW_CREATED,
  WINDOW_KILLED,
  WINDOW_UPDATE,
}

export interface InternalMessage {
  type: InternalMessageType;
  data?: any;
}

export interface MultiWindowMessage<T = any> {
  sender: string;
  recipients: null | string[];
  data?: T;
}
