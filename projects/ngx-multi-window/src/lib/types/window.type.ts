export interface AppWindow {
  id: string;
  name: string;
  channels: string[];
}

export type MessageRecipients = null | string | string[] | AppWindow | AppWindow[];
