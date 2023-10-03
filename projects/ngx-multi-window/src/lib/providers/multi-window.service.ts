import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, map, Observable, Subject, Subscription, tap } from 'rxjs';

import { AppWindow, MessageRecipients } from '../types/window.type';
import { InternalMessage, InternalMessageType, MultiWindowMessage } from '../types/message.type';

@Injectable({
  providedIn: 'root'
})
export class MultiWindowService implements OnDestroy {
  private readonly appWindow: AppWindow;

  private static readonly InternalChannelName = '_ngxmw_internal';

  public getMyWindow(): Readonly<AppWindow> {
    return this.appWindow;
  }

  /**
   * Map of known app windows
   * @private
   */
  private windows: { [windowId: string]: AppWindow } = {};

  /**
   * Map of channel names the current app has subscribed to.
   * The channel name is mapped to the BroadcastChannel object and subject.
   * @private
   */
  private subscriptions: { [channelName: string]: { broadcastChannel: BroadcastChannel, subject: Subject<MultiWindowMessage> } } = {};

  public setName(name: string): void {
    this.appWindow.name = name;
    this.sendWindowUpdateMessage();
  }

  /**
   * A subject to subscribe to in order to get notified about all known windows
   */
  private windowSubject: Subject<AppWindow[]> = new BehaviorSubject<AppWindow[]>(Object.values(this.windows));

  private windowUnload$ = fromEvent(window, 'beforeunload').pipe(tap(() => this.ngOnDestroy()));
  private unloadSub: Subscription = new Subscription();

  private generateId(): string {
    return new Date().getTime().toString(36).substr(-4) + Math.random().toString(36).substr(2, 9);
  }

  constructor() {
    this.appWindow = {
      id: this.generateId(),
      name: window.name,
      channels: [],
    };
    this.subscribe<InternalMessage>(MultiWindowService.InternalChannelName);
    this.subscriptions[MultiWindowService.InternalChannelName].subject.subscribe(_ => this.handleInternalMessage(_));
    this.sendMessage<InternalMessage>({
      type: InternalMessageType.WINDOW_CREATED,
      data: this.appWindow,
    }, null, MultiWindowService.InternalChannelName);
    this.unloadSub.add(this.windowUnload$.subscribe());
  }

  private handleInternalMessage(message: MultiWindowMessage<InternalMessage>) {
    switch (message.data?.type) {
      case InternalMessageType.WINDOW_CREATED:
        this.windows[message.sender] = message.data?.data;
        this.sendWindowUpdateMessage(message.sender);
        break;
      case InternalMessageType.WINDOW_UPDATE:
        this.windows[message.sender] = message.data?.data;
        break;
      case InternalMessageType.WINDOW_KILLED:
        delete this.windows[message.sender];
        break;
    }
    this.windowSubject.next(Object.values(this.windows));
  }

  private sendWindowUpdateMessage(recipients: MessageRecipients = null) {
    this.sendMessage<InternalMessage>({
      type: InternalMessageType.WINDOW_UPDATE,
      data: this.appWindow,
    }, recipients, MultiWindowService.InternalChannelName);
  }

  private subscribe<T = any>(channelName: string): boolean {
    if (!this.subscriptions[channelName]?.broadcastChannel) {
      this.subscriptions[channelName] = {
        broadcastChannel: new BroadcastChannel(channelName),
        subject: new Subject<MultiWindowMessage<T>>(),
      };
      this.subscriptions[channelName].broadcastChannel.onmessage = (messageEvent) => {
        if (messageEvent.data.recipients?.includes(this.appWindow.id) === false) {
          return;
        }
        this.subscriptions[channelName].subject.next({
          sender: messageEvent.data.sender,
          recipients: messageEvent.data.recipients,
          data: messageEvent.data.data,
        });
      };
      return true;
    }
    return false;
  }

  public onMessage<T = any>(channelName: string = 'default'): Observable<MultiWindowMessage<T>> {
    if (this.subscribe(channelName)) {
      this.appWindow.channels = Object.keys(this.subscriptions);
      this.sendWindowUpdateMessage();
    }
    return this.subscriptions[channelName].subject.asObservable();
  }

  public sendMessage<T = any>(data: T, recipients: MessageRecipients = null, channelName: string = 'default', autoSubscribe: boolean = false) {
    if (!this.subscriptions[channelName].broadcastChannel) {
      if (!autoSubscribe) {
        throw new Error('Cannot send message to BroadcastChannel "' + channelName + '" not subscribed to');
      }
      this.onMessage(channelName);
    }
    this.subscriptions[channelName].broadcastChannel.postMessage({
      sender: this.appWindow.id,
      recipients: recipients === null ? null : (Array.isArray(recipients) ? recipients : [recipients])
        .map(recipient => typeof recipient === 'string' ? recipient : recipient.id)
        .filter(recipientId => recipientId !== this.appWindow.id),
      data,
    });
  }

  public unsubscribe(channelName: string) {
    return channelName !== MultiWindowService.InternalChannelName && this.doUnsubscribe(channelName);
  }

  private doUnsubscribe(channelName: string) {
    if (this.subscriptions[channelName]?.broadcastChannel) {
      this.subscriptions[channelName].broadcastChannel.close();
      this.subscriptions[channelName].subject.complete();
      delete this.subscriptions[channelName];
      this.appWindow.channels = Object.keys(this.subscriptions);
      this.sendWindowUpdateMessage();
      return true;
    }
    return false;
  }

  ngOnDestroy() {
    this.sendMessage<InternalMessage>({ type: InternalMessageType.WINDOW_KILLED }, null, MultiWindowService.InternalChannelName);
    this.unloadSub.unsubscribe();
  }

  /**
   * An observable to subscribe to. It emits the array of known AppWindows.
   *
   * This Observable emits the last list of known windows on subscription
   * (refer to rxjs BehaviorSubject).
   */
  public onWindows(): Observable<AppWindow[]> {
    return this.windowSubject.asObservable();
  }

  public onChannels(): Observable<string[]> {
    return this.windowSubject.pipe(map(windows => [...new Set(windows.map(window => window.channels).flat())]));
  }
}
