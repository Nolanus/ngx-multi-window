import { Inject, Injectable, OnDestroy, OnInit, Optional } from '@angular/core';
import { Location } from '@angular/common';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';

import { StorageService } from './storage.service';
import { defaultMultiWindowConfig, NGXMW_CONFIG } from './config.provider';
import { MultiWindowConfig } from '../types/multi-window.config';
import { WindowData, AppWindow, KnownAppWindow } from '../types/window.type';
import { Message, MessageType, MessageTemplate } from '../types/message.type';
import { WindowRef } from 'ngx-multi-window/lib/providers/window.provider';
import { NameSafeStrategy } from 'ngx-multi-window/lib/types/name-safe-strategy.enum';
import { isString } from 'util';
import { stringDistance } from 'codelyzer/util/utils';

@Injectable({
  providedIn: 'root',
})
export class MultiWindowService {

  private config: MultiWindowConfig;

  private myWindow: WindowData;

  private heartbeatId = null;
  private windowScanId = null;

  private knownWindows: KnownAppWindow[] = [];

  /**
   * A hash that keeps track of subjects for all send messages
   */
  private messageTracker: { [key: string]: Subject<string> } = {};

  /**
   * A copy of the outbox that is regularly written to the local storage
   */
  private outboxCache: { [key: string]: Message } = {};

  /**
   * A subject to subscribe to in order to get notified about messages send to this window
   */
  private messageSubject: Subject<Message> = new Subject<Message>();

  /**
   * A subject to subscribe to in order to get notified about all known windows
   */
  private windowSubject: Subject<KnownAppWindow[]> = new BehaviorSubject<KnownAppWindow[]>(this.knownWindows);

  private static generateId(): string {
    return new Date().getTime().toString(36).substr(-4) + Math.random().toString(36).substr(2, 9);
  }

  private tryMatchWindowKey(source: string): string {
    const nameRegex = new RegExp(
      // Escape any potential regex-specific chars in the keyPrefix which may be changed by the dev
      this.config.keyPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + 'w_([a-z0-9]+)'
    );
    const match = source.match(nameRegex);
    if (match !== null) {
      return match[1];
    }
    return null;
  }

  private generatePayloadKey({messageId}: Message): string {
    return this.config.keyPrefix + 'payload_' + messageId;
  }

  private generateWindowKey(windowId: string): string {
    return this.config.keyPrefix + 'w_' + windowId;
  }

  private isWindowKey(key: string): boolean {
    return key.indexOf(this.config.keyPrefix + 'w_') === 0;
  }

  constructor(@Inject(NGXMW_CONFIG) customConfig: MultiWindowConfig, @Optional() private location: Location,
              private storageService: StorageService, private windowRef: WindowRef) {
    this.config = {...defaultMultiWindowConfig, ...customConfig};

    let windowId: string;

    if (this.location) {
      // Try to extract the new window name from the location path
      windowId = this.tryMatchWindowKey(this.location.path(true));
    }
    // Only check the name safe strategy if no id has been extracted from the path already
    if (!windowId && this.config.nameSafeStrategy !== NameSafeStrategy.NONE) {
      // There might be window data stored in the window.name property, try restoring it
      const storedWindowData = this.windowRef.nativeWindow.name;

      if (this.config.nameSafeStrategy === NameSafeStrategy.SAVE_BACKUP) {
        // There should be a JSON string in the window.name, try parsing it and set the values
        try {
          const storedJsonData = JSON.parse(storedWindowData);
          windowId = storedJsonData.ngxmw_id;
          this.windowRef.nativeWindow.name = storedJsonData.backup;
        } catch (ex) { // Swallow JSON parsing exceptions, as we can't handle them anyway
        }
      } else {
        windowId = this.tryMatchWindowKey(storedWindowData);
        if (this.config.nameSafeStrategy === NameSafeStrategy.SAVE_WHEN_EMPTY) {
          this.windowRef.nativeWindow.name = '';
        }
      }
    }
    this.init(windowId);
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
   * @returns
   */
  public onWindows(): Observable<KnownAppWindow[]> {
    return this.windowSubject.asObservable();
  }

  /**
   * Get the latest list of known windows.
   *
   * Use {@link onWindows} to get an observable which emits
   * whenever is updated.
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
    if (!this.heartbeatId) {
      this.heartbeatId = setInterval(this.heartbeat, this.config.heartbeat);
    }
    if (!this.windowScanId) {
      this.windowScanId = setInterval(this.scanForWindows, this.config.newWindowScan);
    }
  }

  /**
   * Stop the current instance of the angular app/service/tab from participating in the cross window communication.
   * It stops the interval-based checking for messages and updating the heartbeat.
   *
   * Note: There should be no need to call this method in production apps.
   */
  public stop(): void {
    if (this.heartbeatId) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    if (this.windowScanId) {
      clearInterval(this.windowScanId);
      this.windowScanId = null;
    }
  }

  /**
   * Remove the current window representation from the localstorage.
   *
   * Note: Unless you {@link stop}ped the service the window representation will be
   * recreated after {@link MultiWindowConfig#heartbeat} milliseconds
   */
  public clear(): void {
    this.storageService.removeLocalItem(this.generateWindowKey(this.myWindow.id));
  }

  /**
   * Send a message to another window.
   *
   * @param recipientId The ID of the recipient window.
   * @param event Custom identifier to distinguish certain events
   * @param data Custom data to contain the data for the event
   * @param payload Further data to be passed to the recipient window via a separate entry in the localstorage
   * @returns An observable that emits the messageId once the message has been put into
   * the current windows outbox. It completes on successful delivery and fails if the delivery times out.
   */
  public sendMessage(recipientId: string, event: string, data: any, payload?: any): Observable<string> {
    const messageId = this.pushToOutbox({
      recipientId,
      type: MessageType.MESSAGE,
      event,
      data,
      payload,
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
   */
  public newWindow(): { windowId: string, urlString: string, created: Observable<string> } {
    if (this.location === null) {
      // Reading information from the URL is only possible with the Location provider. If
      // this window does not have one, another one will have none as well and thus would
      // not be able to read its new windowId from the url path
      throw new Error('No Location Provider present');
    }
    const newWindowId = MultiWindowService.generateId();

    const messageId = this.pushToOutbox({
      recipientId: newWindowId,
      type: MessageType.PING,
      event: undefined,
      data: undefined,
      payload: undefined,
    });

    this.messageTracker[messageId] = new Subject<string>();

    return {
      windowId: newWindowId,
      urlString: this.generateWindowKey(newWindowId),
      created: this.messageTracker[messageId].pipe(ignoreElements()),
    };
  }

  public saveWindow(): void {
    if (this.config.nameSafeStrategy !== NameSafeStrategy.NONE) {
      const windowId = this.generateWindowKey(this.id);
      if ((this.config.nameSafeStrategy === NameSafeStrategy.SAVE_WHEN_EMPTY && !this.windowRef.nativeWindow.name)
        || this.config.nameSafeStrategy === NameSafeStrategy.SAVE_FORCE) {
        this.windowRef.nativeWindow.name = windowId;
      } else if (this.config.nameSafeStrategy === NameSafeStrategy.SAVE_BACKUP) {
        this.windowRef.nativeWindow.name = JSON.stringify({ngxmw_id: windowId, backup: this.windowRef.nativeWindow.name});
      }
    }
  }

  private init(windowId?: string): void {
    const windowKey = windowId
      ? this.generateWindowKey(windowId)
      : this.storageService.getWindowName();
    let windowData: WindowData | null = null;
    if (windowKey && this.isWindowKey(windowKey)) {
      windowData = this.storageService.getLocalObject<WindowData>(windowKey);
    }

    if (windowData !== null) {
      // Restore window information from storage
      this.myWindow = {
        id: windowData.id,
        name: windowData.name,
        heartbeat: windowData.heartbeat,
      };
    } else {
      const myWindowId = windowId || MultiWindowService.generateId();
      this.myWindow = {
        id: myWindowId,
        name: 'AppWindow ' + myWindowId,
        heartbeat: -1,
      };
    }

    this.storageService.setWindowName(windowKey);

    // Scan for already existing windows
    this.scanForWindows();

    // Trigger heartbeat for the first time
    this.heartbeat();
  }

  private pushToOutbox({ recipientId, type, event, data, payload }: MessageTemplate,
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
      send: false,
    };

    return messageId;
  }

  private heartbeat = () => {
    const now = new Date().getTime();
    // Check whether there are new messages for the current window in the other window's outboxes

    // Store the ids of all messages we receive in this iteration
    const receivedMessages: string[] = [];

    this.knownWindows.forEach(windowData => {
      // Load the window from the localstorage
      const appWindow = this.storageService.getLocalObject<AppWindow>(this.generateWindowKey(windowData.id));

      if (appWindow === null) {
        // No window found, it possibly got closed/removed since our last scanForWindow
        return;
      }

      if (appWindow.id === this.myWindow.id) {
        // Ignore messages from myself (not done using Array.filter to reduce array iterations)
        // but check for proper last heartbeat time
        if (this.myWindow.heartbeat !== -1 && this.myWindow.heartbeat !== appWindow.heartbeat) {
          // The heartbeat value in the localstorage is a different one than the one we wrote into localstorage
          // during our last heartbeat. There are probably two app windows
          // using the same window id => change the current windows id
          this.myWindow.id = MultiWindowService.generateId();
          // tslint:disable-next-line:no-console
          console.warn('Window ' + appWindow.id + '  detected that there is probably another instance with' +
            ' this id, changed id to ' + this.myWindow.id);
          this.storageService.setWindowName(this.generateWindowKey(this.myWindow.id));
        }

        return;
      }

      if (now - appWindow.heartbeat > this.config.windowTimeout) {
        // The window seems to be dead, remove the entry from the localstorage
        this.storageService.removeLocalItem(this.generateWindowKey(appWindow.id));
      }

      // Update the windows name and heartbeat value in the list of known windows (that's what we iterate over)
      windowData.name = appWindow.name;
      windowData.heartbeat = appWindow.heartbeat;

      if (appWindow.messages && appWindow.messages.length > 0) {
        // This other window has messages, so iterate over the messages the other window has
        appWindow.messages.forEach(message => {
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
                  const payloadKey = this.generatePayloadKey(message);
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
      const message = this.outboxCache[messageId];
      if (message.type === MessageType.MESSAGE_RECEIVED && !receivedMessages.some(msgId => msgId === messageId)) {
        // It's a message confirmation and we did not receive the 'original' method for that confirmation
        // => the sender has received our confirmation and removed the message from it's outbox, thus we can
        //     safely remove the message confirmation as well
        delete this.outboxCache[messageId];
      } else if (message.type !== MessageType.MESSAGE_RECEIVED && now - message.sendTime > this.config.messageTimeout) {
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
          this.storageService.setLocalObject(this.generatePayloadKey(message), message.payload);
          message.payload = true;
        }
        this.messageTracker[message.messageId].next(message.messageId);
        // Set property to undefined, as we do not need to encode "send:true" in the localstorage json multiple times
        message.send = undefined;
      }
    });

    this.storageService.setLocalObject(this.generateWindowKey(this.myWindow.id), {
      heartbeat: now,
      id: this.myWindow.id,
      name: this.myWindow.name,
      messages: Object.keys(this.outboxCache).map(key => this.outboxCache[key]),
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
    this.knownWindows = this.storageService.getLocalObjects<WindowData>(
      this.storageService.getLocalItemKeys().filter((key) => this.isWindowKey(key)))
      .map(({ id, name, heartbeat }: WindowData) => {
        return {
          id,
          name,
          heartbeat,
          stalled: new Date().getTime() - heartbeat > this.config.heartbeat * 2,
          self: this.myWindow.id === id,
        };
      });
    this.windowSubject.next(this.knownWindows);
  }
}
