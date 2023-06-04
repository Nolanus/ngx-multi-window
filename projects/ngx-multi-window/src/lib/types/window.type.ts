export interface KnownAppWindow {
  id: string;
  name: string;
  self: boolean;
}


export interface KnownWindows {
  [broadcastId: string]: KnownAppWindow[];
}
