import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, fromEvent, Observable, Subject, Subscription, tap} from 'rxjs';

import {KnownAppWindow, KnownWindows} from '../types/window.type';
import {
  InternalMessage, InternalMessageTemplate,
  InternalMessageType,
  Message,
  MessageTemplate,
  MessageType
} from '../types/message.type';

@Injectable({
  providedIn: 'root',
})
export class MultiWindowService implements OnDestroy {

  private myWindow: KnownAppWindow = {} as KnownAppWindow;

  public getMyWindow(): KnownAppWindow {
    return this.myWindow;
  }

  public setName(name: string): void {
    this.myWindow.name = name;
    this.sendInternalMessage({
      type: InternalMessageType.CHANGE_NAME,
      isInternal: true
    } as InternalMessageTemplate);
    for (const bcId of Object.keys(this.knownBroadcasters)) {
      for (let win of this.knownWindows[bcId]) {
        if (win.id == this.myWindow.id)
          win.name = name;
      }
    }
  }

  private knownWindows: KnownWindows = {};

  private knownBroadcasters: {[broadcastId: string]: BroadcastChannel} = {};

  private knownListeners: string[] = [];

  /**
   * A subject to subscribe to in order to get notified about messages sent to this window
   */
  private messageSubjects: Subject<Message>[] = [];

  /**
   * A subject to subscribe to in order to get notified about all known windows
   */
  private windowSubject: Subject<KnownWindows> = new BehaviorSubject<KnownWindows>(this.knownWindows);

  private windowUnload$ = fromEvent(window, 'unload').pipe(tap(() => this.destroy()));
  private unloadSub: Subscription = new Subscription();

  private generateId(): string {
    return new Date().getTime().toString(36).substr(-4) + Math.random().toString(36).substr(2, 9);
  }

  constructor() {
    this.myWindow.id = this.generateId();
    this.myWindow.name = window.name;
    this.myWindow.self = true;
    this.unloadSub.add(this.windowUnload$.subscribe());
  }

  private destroy() {
    this.handleServiceDestroyed();
    this.closeAllListeners();
  }

  ngOnDestroy() {
    this.unloadSub.unsubscribe();
  }

  public getKnownBroadcasters(): BroadcastChannel[] {
    let knownBroadcasters: BroadcastChannel[] = [];
    for (const bcId of Object.keys(this.knownBroadcasters)) {
      knownBroadcasters.push(this.knownBroadcasters[bcId]);
    }
    return knownBroadcasters;
  }

  /**
   * An observable to subscribe to. It emits all messages the current window receives.
   * After a message has been emitted by this observable it is marked as read, so the sending window
   * gets informed about successful delivery.
   */
  public getBroadcastChannel(broadcastChannelId: string): BroadcastChannel {
    for (const bcId of Object.keys(this.knownBroadcasters)) {
      const bc = this.knownBroadcasters[bcId];
      if (bcId == broadcastChannelId)
        return bc;
    }
    const bc = new BroadcastChannel(broadcastChannelId);
    this.knownBroadcasters[bc.name] = bc;
    this.messageSubjects[bc.name] = new Subject<Message>();
    return bc;
  }

  public listen(broadcastChannelId: string): MultiWindowService {
    const bc = this.getBroadcastChannel(broadcastChannelId);
    if (this.knownWindows[bc.name] == undefined)
      this.knownWindows[bc.name] = [];
    this.knownWindows[bc.name].push({
      id: this.myWindow.id,
      name: this.myWindow.name,
      self: true
    } as KnownAppWindow);
    if (this.knownListeners[bc.name] == undefined) {
      bc.onmessage = (message: any) => {
        let msg = message.data;
        if (msg.isInternal != undefined) {
          msg = message.data as InternalMessage;
          switch (msg.type) {
            case InternalMessageType.WINDOW_KILLED:
              // We want to handle the window killed here and make sure we remove it as a known window
              this.knownWindows[bc.name] = this.knownWindows[bc.name].filter((win) => {
                return win.id != msg.senderId
              });
              this.windowSubject.next(this.knownWindows);
              break;
            case InternalMessageType.WINDOW_CREATED:
              this.knownWindows[bc.name].push({name: msg.senderName, id: msg.senderId} as KnownAppWindow);
              this.windowSubject.next(this.knownWindows);
              break;
            case InternalMessageType.REQUEST_ALL_WINDOWS:
              this.sendInternalMessage({
                type: InternalMessageType.REPORT_WINDOW,
                isInternal: true,
                recipientId: msg.senderId
              } as InternalMessageTemplate, bc.name);
              break;
            case InternalMessageType.REPORT_WINDOW:
              if (msg.recipientId == this.myWindow.id) {
                // They requested all the windows to report, give them the windows
                this.knownWindows[bc.name].push({name: msg.senderName, id: msg.senderId} as KnownAppWindow);
                this.windowSubject.next(this.knownWindows);
              }
              break;
            case InternalMessageType.CHANGE_NAME:
              for (let win of this.knownWindows[bc.name]) {
                if (msg.senderId == win.id)
                  win.name = msg.senderName;
              }
              break;
          }
          return;
        }
        msg = message.data as Message;
        switch (msg.type) {
          case MessageType.SPECIFIC_WINDOW:
            if (msg.recipientId == this.myWindow.id)
              this.messageSubjects[bc.name].next(msg);
            break;
          case MessageType.ALL_LISTENERS:
            this.messageSubjects[bc.name].next(msg);
            break;
        }
      }
    }
    // When we register a new listener, we want to tell all the windows listening that we have a new known window to add to their list...
    this.sendInternalMessage({
      type: InternalMessageType.WINDOW_CREATED,
      isInternal: true
    } as InternalMessageTemplate);
    this.sendInternalMessage({
      type: InternalMessageType.REQUEST_ALL_WINDOWS,
      isInternal: true
    } as InternalMessageTemplate);
    return this;
  }

  public closeListener(broadcastChannelId: string) {
    if (this.knownListeners[broadcastChannelId] != undefined) {
      this.getBroadcastChannel(broadcastChannelId).close();
      delete this.knownListeners[broadcastChannelId];
    }
  }
  public closeAllListeners() {
    for (const bcId of this.knownListeners) {
      this.getBroadcastChannel(bcId).close();
    }
    this.knownListeners = [];
  }
  private handleServiceDestroyed() {
    this.sendInternalMessage({
      type: InternalMessageType.WINDOW_KILLED,
      isInternal: true
    } as InternalMessageTemplate);
    this.closeAllListeners();
  }

  public onMessage(broadcastChannelId: string): Observable<Message> {
    return this.messageSubjects[broadcastChannelId].asObservable();
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
  public onWindows(): Observable<KnownWindows> {
    return this.windowSubject.asObservable();
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
  /** /
  public onWindows(): Observable<KnownAppWindow[]> {
    return this.windowSubject.asObservable();
  }
  /* */

  /**
   * Get the latest list of known windows.
   *
   * Use {@link onWindows} to get an observable which emits
   * whenever is updated.
   */
  public getKnownWindows() {
    return this.knownWindows;
  }

  private sendInternalMessage(message: InternalMessageTemplate, broadcastId?: string) {
    let msg: InternalMessage = message as InternalMessage;
    msg.senderName = this.myWindow.name;
    msg.senderId = this.myWindow.id;
    switch (msg.type) {
      case InternalMessageType.SPECIFIC_LISTENER:
        this.getBroadcastChannel(broadcastId).postMessage(msg);
        break;
      default:
        for (const bc of this.getKnownBroadcasters()) {
          bc.postMessage(msg);
        }
    }
  }
  public sendMessage(message: MessageTemplate, broadcastId?: string) {
    let msg: Message = message as Message;
    msg.senderName = this.myWindow.name;
    msg.senderId = this.myWindow.id;
    switch (msg.type) {
      case MessageType.SPECIFIC_LISTENER:
        this.getBroadcastChannel(broadcastId).postMessage(msg);
        break;
      default:
        for (const bc of this.getKnownBroadcasters()) {
          bc.postMessage(msg);
        }
    }
  }
}
