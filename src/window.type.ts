import {Message} from './message.type';

export interface WindowData {
    id: string;
    name: string;
}

/**
 * Represents a window with the current application how it is stored
 * in the localstorage. It has an id, name, heartbeat represented in a timestamp
 * and an array of messages that that window sent out.
 *
 * It's named "AppWindow" to avoid confusion with the type Window
 * of the global variable "window".
 */
export interface AppWindow extends WindowData {
    heartbeat: number;
    messages: Message[];
}
