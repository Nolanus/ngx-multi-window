import {ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {EventType, KnownWindows, Message, MessageType, MultiWindowService} from 'ngx-multi-window';
import {Subscription} from "rxjs";
import {NameGeneratorService} from "./providers/name-generator.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  ownName: string;
  ownId: string;

  logs: string[] = [];

  newName: string;

  windows: KnownWindows = {};

  private subs: Subscription = new Subscription();

  constructor(private multiWindowService: MultiWindowService, private changeDetectorRef: ChangeDetectorRef, private nameGenerator: NameGeneratorService) {}

  public pause(milliseconds) {
    var dt = new Date();
    while ((new Date().getTime()) - dt.getTime() <= milliseconds) { /* Do nothing */ }
  }

  public changeName() {
    this.ownName = this.newName;
    this.multiWindowService.setName(this.newName);
  }

  ngOnInit(): void {
    this.ownId = this.multiWindowService.getMyWindow().id;
    this.ownName = this.nameGenerator.getRandomFakeName();
    this.multiWindowService.setName(this.ownName);
    this.newName = this.ownName;
    this.multiWindowService.listen('data');
    this.subs.add(this.multiWindowService.onMessage('data').subscribe((value: Message) => {
      console.log("[DEBUG] Received message:", value);
      if (value.senderId != this.ownId) {
        this.logs.unshift('Received a message from ' + value.senderId + ': ' + value.data);
        this.changeDetectorRef.detectChanges();
      }
    }));
    this.windows = this.multiWindowService.getKnownWindows();
    this.subs.add(this.multiWindowService.onWindows().subscribe((knownWindows) => {
      this.windows = knownWindows;
      this.changeDetectorRef.detectChanges();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public sendMessageToAll(message: string) {
    this.multiWindowService.sendMessage({
      data: message,
      type: MessageType.ALL_LISTENERS,
      event: EventType.CUSTOM_EVENT
    } as Message);
  }

  public sendMessage(message: string, recipientId: string) {
    if (recipientId != 'ALL') {
      this.multiWindowService.sendMessage({
        data: message,
        type: MessageType.SPECIFIC_WINDOW,
        event: EventType.CUSTOM_EVENT,
        recipientId: recipientId
      } as Message);
    } else {
      this.sendMessageToAll(message);
    }
  }

  public removeLogMessage(index: number) {
    this.logs.splice(index, 1);
  }

  public newWindow() {
    window.open('?');
  }
}
