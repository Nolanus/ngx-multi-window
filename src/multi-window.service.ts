import { Injectable, Optional, SkipSelf } from '@angular/core';
import { Location } from '@angular/common';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

import { StorageService } from './storage.service';
import { MultiWindowConfig } from './multi-window.config';
import { WindowData, AppWindow, KnownAppWindow } from './window.type';
import { Message, MessageType, MessageTemplate } from './message.type';

@Injectable()
export class MultiWindowService {

    private myWindow: WindowData;

    private heartbeatId = -1;
    private windowScanId = -1;

    private knownWindows: KnownAppWindow[] = [];

    /**
     * A hash that keeps track of subjects for all send messages
     * @type {{}}
     */
    private messageTracker: {[key: string]: Subject<string>} = {};

    /**
     * A copy of the outbox that is regularly written to the local storage
     * @type {{}}
     */
    private outboxCache: {[key: string]: Message} = {};

    /**
     * A subject to subscribe to in order to get notified about messages send to this window
     * @type {Subject<Message>}
     */
    private messageSubject: Subject<Message> = new Subject<Message>();

    /**
     * A subjct to subscribe to in order to get notified about all known windows
     * @type {BehaviorSubject<WindowData[]>}
     */
    private windowSubject: Subject<KnownAppWindow[]> = new BehaviorSubject<KnownAppWindow[]>(this.knownWindows);

    private static generateId(): string {
        return new Date().getTime().toString(36).substr(-4) + Math.random().toString(36).substr(2, 9);
    }

    private static generatePayloadKey({messageId}: Message): string {
        return MultiWindowConfig.keyPrefix + 'payload_' + messageId;
    }

    private static generateWindowKey(windowId: string): string {
        return MultiWindowConfig.keyPrefix + 'w_' + windowId;
    }

    private static isWindowKey(key: string): boolean {
        return key.indexOf(MultiWindowConfig.keyPrefix + 'w_') === 0;
    }

    constructor(@Optional() private location: Location, private storageService: StorageService) {
        let windowName = undefined;
        if (location) {
            // Try to extract the new window name from the location path
            let nameRegex = new RegExp(
                // Escape any potential regex-specific chars in the keyPrefix which may be changed by the dev
                MultiWindowConfig.keyPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
                + 'w_([a-z0-9]+)'
            );
            let match = location.path(true).match(nameRegex);
            if (match !== null) {
                windowName = match[1];
            }
        }
        this.init(windowName);
        this.start();
    }

    get name(): string {
        return this.myWindow.name;
    }

    set name(value: string) {
        this.myWindow.name = value;
    }

    get id(): string {
        return this.myWindow.id;
    }

    /**
     * An observable to subscribe to. It emits all messages the current window receives.
     * After a message has been emitted by this observable it is marked as read, so the sending window
     * gets informed about successful delivery.
     *
     * @returns {Observable<Message>}
     */
    public onMessage(): Observable<Message> {
        return this.messageSubject.asObservable();
    }

    /**
     * An observable to subscribe to. It emits the array of known windows
     * whenever it is read again from the localstorage.
     *
     * This Observable emits the last list of known windows on subscription
     * (refer to rxjs BehaviorSubject).
     *
     * Use {@link getKnownWindows} to get the current list of
     * known windows or if you only need a snapshot of that list.
     *
     * @see {@link MultiWindowConfig#newWindowScan}
     * @returns {Observable<WindowData[]>}
     */
    public onWindows(): Observable<WindowData[]> {
        return this.windowSubject.asObservable();
    }

    /**
     * Get the latest list of known windows.
     *
     * Use {@link onWindows} to get an observable which emits
     * whenever is updated.
     *
     * @returns {WindowData[]}
     */
    public getKnownWindows() {
        return this.knownWindows;
    }

    /**
     * Start so that the current instance of the angular app/service/tab participates in the cross window communication.
     * It starts the interval-based checking for messages and updating the heartbeat.
     *
     * Note: There should be no need to call this method in production apps. It will automatically be called internally
     * during service construction (see {@link MultiWindowService} constructor)
     */
    public start(): void {
        if (this.heartbeatId === -1) {
            this.heartbeatId = setInterval(this.heartbeat, MultiWindowConfig.heartbeat);
        }
        if (this.windowScanId === -1) {
            this.windowScanId = setInterval(this.scanForWindows, MultiWindowConfig.newWindowScan);
        }
    }

    /**
     * Stop the current instance of the angular app/service/tab from participating in the cross window communication.
     * It stops the interval-based checking for messages and updating the heartbeat.
     *
     * Note: There should be no need to call this method in production apps.
     */
    public stop(): void {
        if (this.heartbeatId >= 0) {
            clearInterval(this.heartbeatId);
            this.heartbeatId = -1;
        }
        if (this.windowScanId >= 0) {
            clearInterval(this.windowScanId);
            this.windowScanId = -1;
        }
    }

    /**
     * Remove the current window representation from the localstorage.
     *
     * Note: Unless you {@link stop}ped the service the window representation will be
     * recreated after {@link MultiWindowConfig#heartbeat} milliseconds
     */
    public clear(): void {
        this.storageService.removeLocalItem(MultiWindowService.generateWindowKey(this.myWindow.id));
    }

    /**
     * Send a message to another window.
     *
     * @param recipientId The ID of the recipient window.
     * @param event Custom identifier to distinguish certain events
     * @param data Custom data to contain the data for the event
     * @param payload Further data to be passed to the recipient window via a separate entry in the localstorage
     * @returns {Observable<string>} An observable that emits the messageId once the message has been put into
     * the current windows outbox. It completes on successful delivery and fails if the delivery times out.
     */
    public sendMessage(recipientId: string, event: string, data: any, payload: any = undefined): Observable<string> {
        let messageId = this.pushToOutbox({
            recipientId,
            type: MessageType.MESSAGE,
            event,
            data,
            payload
        });

        this.messageTracker[messageId] = new Subject<string>();
        return this.messageTracker[messageId].asObservable();
    }

    /**
     * Create a new window and get informed once it has been created.
     *
     * Note: The actual window "creation" of redirection needs to be performed by
     * the library user. This method only returns helpful information on how to
     * do that
     *
     * The returned object contains three properties:
     *
     * windowId: An id generated to be assigned to the newly created window
     *
     * urlString: This string must be included in the url the new window loads.
     * It does not matter whether it is in the path, query or hash part
     *
     * created: An observable that will complete after new window was opened and was able
     * to receive a message. If the window does not start consuming messages within
     * {@link MultiWindowConfig#messageTimeout}, this observable will fail, although
     * the window might become present after that. The Observable will never emit any elements.
     *
     * @returns {{windowId: string, urlString: string, created: Observable<string>}}
     */
    public newWindow(): {windowId: string, urlString: string, created: Observable<string>} {
        if (this.location === null) {
            // Reading information from the URL is only possible with the Location provider. If
            // this window does not have one, another one will have none as well and thus would
            // not be able to read its new windowId from the url path
            throw new Error('No Location Provider present');
        }
        let newWindowId = MultiWindowService.generateId();

        let messageId = this.pushToOutbox({
            recipientId: newWindowId,
            type: MessageType.PING,
            event: undefined,
            data: undefined,
            payload: undefined
        });

        this.messageTracker[messageId] = new Subject<string>();

        return {
            windowId: newWindowId,
            urlString: MultiWindowService.generateWindowKey(newWindowId),
            created: this.messageTracker[messageId].ignoreElements()
        };
    }

    private init(windowId?: string): void {
        let windowKey = windowId
            ? MultiWindowService.generateWindowKey(windowId)
            : this.storageService.getWindowName();
        let windowData: WindowData | null = null;
        if (windowKey && MultiWindowService.isWindowKey(windowKey)) {
            windowData = this.storageService.getLocalObject<WindowData>(windowKey);
        }

        if (windowData !== null) {
            // Restore window information from storage
            this.myWindow = {
                id: windowData.id,
                name: windowData.name,
                heartbeat: windowData.heartbeat
            };
        } else {
            let myWindowId = windowId || MultiWindowService.generateId();
            this.myWindow = {
                id: myWindowId,
                name: 'AppWindow ' + myWindowId,
                heartbeat: -1
            };
        }

        this.storageService.setWindowName(windowKey);

        // Scan for already existing windows
        this.scanForWindows();

        // Trigger heartbeat for the first time
        this.heartbeat();
    }

    private pushToOutbox({recipientId, type, event, data, payload}: MessageTemplate,
        messageId: string = MultiWindowService.generateId()): string {
        if (recipientId === this.id) {
            throw new Error('Cannot send messages to self');
        }
        this.outboxCache[messageId] = {
            messageId,
            recipientId,
            senderId: this.myWindow.id,
            sendTime: new Date().getTime(),
            type,
            event,
            data,
            payload,
            send: false
        };

        return messageId;
    }

    private heartbeat = () => {
        let now = new Date().getTime();
        // Check whether there are new messages for the current window in the other window's outboxes

        // Store the ids of all messages we receive in this iteration
        let receivedMessages: string[] = [];

        this.knownWindows.forEach(windowData => {
            // Load the window from the localstorage
            let window = this.storageService.getLocalObject<AppWindow>(MultiWindowService.generateWindowKey(windowData.id));

            if (window === null) {
                // No window found, it possibly got closed/removed since our last scanForWindow
                return;
            }

            if (window.id === this.myWindow.id) {
                // Ignore messages from myself (not done using Array.filter to reduce array iterations)
                // but check for proper last heartbeat time
                if (this.myWindow.heartbeat !== -1 && this.myWindow.heartbeat !== window.heartbeat) {
                    // The heartbeat value in the localstorage is a different one than the one we wrote into localstorage
                    // during our last heartbeat. There are probably two app windows
                    // using the same window id => change the current windows id
                    this.myWindow.id = MultiWindowService.generateId();
                    // tslint:disable-next-line:no-console
                    console.warn('Window ' + window.id + '  detected that there is probably another instance with' +
                        ' this id, changed id to ' + this.myWindow.id);
                    this.storageService.setWindowName(MultiWindowService.generateWindowKey(this.myWindow.id));
                }
                return;
            }

            if (now - window.heartbeat > MultiWindowConfig.windowTimeout) {
                // The window seems to be dead, remove the entry from the localstorage
                this.storageService.removeLocalItem(MultiWindowService.generateWindowKey(window.id));
            }

            // Update the windows name and heartbeat value in the list of known windows (that's what we iterate over)
            windowData.name = window.name;
            windowData.heartbeat = window.heartbeat;

            if (window.messages && window.messages.length > 0) {
                // This other window has messages, so iterate over the messages the other window has
                window.messages.forEach(message => {
                    if (message.recipientId !== this.myWindow.id) {
                        // The message is not targeted to the current window
                        return;
                    }

                    if (message.type === MessageType.MESSAGE_RECEIVED) {
                        // It's a message to inform the current window that a previously sent message from the
                        // current window has been processed by the recipient window

                        // Trigger the observable to complete and then remove it
                        if (this.messageTracker[message.messageId]) {
                            this.messageTracker[message.messageId].complete();
                        }
                        delete this.messageTracker[message.messageId];

                        // Remove the message from the outbox, as the transfer is complete
                        delete this.outboxCache[message.messageId];
                    } else {
                        receivedMessages.push(message.messageId);
                        // Check whether we already processed that message. If that's the case we've got a 'message_received'
                        // confirmation in our own outbox.

                        if (!(this.outboxCache[message.messageId] &&
                            this.outboxCache[message.messageId].type === MessageType.MESSAGE_RECEIVED)) {
                            // We did not process that message

                            // Create a new message for the message sender in the current window's
                            // outbox that the message has been processed (reuse the message id for that)
                            this.pushToOutbox({
                                recipientId: message.senderId,
                                type: MessageType.MESSAGE_RECEIVED,
                                event: undefined,
                            }, message.messageId);

                            // Process it locally, unless it's just a PING message
                            if (message.type !== MessageType.PING) {
                                if (message.payload === true) {
                                    // The message has a separate payload
                                    let payloadKey = MultiWindowService.generatePayloadKey(message);
                                    message.payload = this.storageService.getLocalObject<any>(payloadKey);
                                    this.storageService.removeLocalItem(payloadKey);
                                }
                                this.messageSubject.next(message);
                            }
                        }
                    }
                });
            }
        });

        // Iterate over the outbox to clean it up, process timeouts and payloads
        Object.keys(this.outboxCache).forEach(messageId => {
            let message = this.outboxCache[messageId];
            if (message.type === MessageType.MESSAGE_RECEIVED && !receivedMessages.some(msgId => msgId === messageId)) {
                // It's a message confirmation and we did not receive the 'original' method for that confirmation
                // => the sender has received our confirmation and removed the message from it's outbox, thus we can
                //     safely remove the message confirmation as well
                delete this.outboxCache[messageId];
            } else if (message.type !== MessageType.MESSAGE_RECEIVED && now - message.sendTime > MultiWindowConfig.messageTimeout) {
                // Delivering the message has failed, as the target window did not pick it up in time
                // The type of message doesn't matter for that
                delete this.outboxCache[messageId];
                if (this.messageTracker[messageId]) {
                    this.messageTracker[messageId].error('Timeout');
                }
                delete this.messageTracker[messageId];
            } else if (message.type === MessageType.MESSAGE && message.send === false) {
                if (message.payload !== undefined && message.payload !== true) {
                    // Message has a payload that has not been moved yet, so move that in a separate localstorage key
                    this.storageService.setLocalObject(MultiWindowService.generatePayloadKey(message), message.payload);
                    message.payload = true;
                }
                this.messageTracker[message.messageId].next(message.messageId);
                // Set property to undefined, as we do not need to encode "send:true" in the localstorage json multiple times
                message.send = undefined;
            }
        });

        // console.log('Writing local object for window ' + this.myWindow.id);
        this.storageService.setLocalObject(MultiWindowService.generateWindowKey(this.myWindow.id), {
            heartbeat: now,
            id: this.myWindow.id,
            name: this.myWindow.name,
            messages: Object.keys(this.outboxCache).map(key => this.outboxCache[key])
        });

        if (this.myWindow.heartbeat === -1) {
            // This was the first heartbeat run for the local window, so rescan for known windows to get
            // the current (new) window in the list
            this.scanForWindows();
        }

        // Store the new heartbeat value in the local windowData copy
        this.myWindow.heartbeat = now;
    }

    private scanForWindows = () => {
        this.knownWindows =
            this.storageService.getLocalObjects<WindowData>(
                this.storageService.getLocalItemKeys().filter(MultiWindowService.isWindowKey)
            ).map(({id, name, heartbeat}: WindowData) => {
                return {
                    id,
                    name,
                    heartbeat,
                    stalled: new Date().getTime() - heartbeat > MultiWindowConfig.heartbeat * 2,
                    self: this.myWindow.id === id
                };
            });
        this.windowSubject.next(this.knownWindows);
    }
}

/* singleton pattern taken from https://github.com/angular/angular/issues/13854 */
export function MultiWindowServiceProviderFactory(parentDispatcher: MultiWindowService,
                                                  location: Location, storageService: StorageService) {
    return parentDispatcher || new MultiWindowService(location, storageService);
}

export const MultiWindowServiceProvider = {
    provide: MultiWindowService,
    deps: [[new Optional(), new SkipSelf(), MultiWindowService], [new Optional(), Location], [StorageService]],
    useFactory: MultiWindowServiceProviderFactory
};
