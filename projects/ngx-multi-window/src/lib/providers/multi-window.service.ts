import {Inject, Injectable, OnDestroy, Optional} from '@angular/core';
import { Location } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { defaultMultiWindowConfig, NGXMW_CONFIG } from './config.provider';
import { MultiWindowConfig } from '../types/multi-window.config';
import { KnownAppWindow } from '../types/window.type';
import { Message } from '../types/message.type';
import { WindowRef } from '../providers/window.provider';

@Injectable({
  providedIn: 'root',
})
export class MultiWindowService implements OnDestroy {

  private config: MultiWindowConfig;

  private myWindow: KnownAppWindow;

  private knownWindows: {[broadcastId: string]: {[windowId: string]: {}}} = {};

  private knownBroadcasters: {[broadcastId: string]: BroadcastChannel} = {};

  private knownListeners: string[] = [];

  /**
   * A subject to subscribe to in order to get notified about messages sent to this window
   */
  private messageSubjects: Subject<Message>[] = [];

  /**
   * A subject to subscribe to in order to get notified about all known windows
   */
  //private windowSubject: Subject<KnownAppWindow[]> = new BehaviorSubject<KnownAppWindow[]>(this.knownWindows);

  private generateId(): string {
    return new Date().getTime().toString(36).substr(-4) + Math.random().toString(36).substr(2, 9);
  }

  constructor(@Inject(NGXMW_CONFIG) customConfig: MultiWindowConfig, @Optional() private location: Location, private windowRef: WindowRef) {
    this.config = {...defaultMultiWindowConfig, ...customConfig};
  }

  public ngOnDestroy() {
    this.handleServiceDestroyed();
    this.closeAllListeners();
  }

  public getKnownBroadcasters(): BroadcastChannel[] {
    let knownBroadcasters: BroadcastChannel[] = [];
    for (const bcId of Object.keys(this.knownBroadcasters)) {
      knownBroadcasters.push(this.knownBroadcasters[bcId]);
    }
    return knownBroadcasters;
  }

  get id(): string {
    return this.myWindow.id;
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
    if (this.knownListeners[bc.name] == undefined) {
      bc.onmessage = (message: any) => {
        if (message.type == 'WINDOW_KILLED') {
          // We want to handle the window killed here and make sure we remove it as a known window
          delete this.knownWindows[bc.name][message.senderId];
          return;
        } else
          if (message.type == 'WINDOW_CREATED') {
            this.knownWindows[bc.name][message.senderId] = {};
            return;
          }
        this.messageSubjects[bc.name].next(message as Message);
      }
    }
    // When we register a new listener, we want to tell all the windows listening that we have a new known window to add to their list...
    this.sendMessageToAll({
      type: 'WINDOW_CREATED',
      senderId: this.id
    })
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
    this.sendMessageToAll({
      type: "WINDOW_KILLED",
      senderId: this.id
    });
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

  public sendMessage(broadcastChannelId: string, message: any) {}
  public sendMessageToAll(message: any) {}
}
