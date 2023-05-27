import { Component, HostListener, OnInit } from '@angular/core';
import { MultiWindowService, Message, KnownAppWindow } from 'ngx-multi-window';
import { NameGeneratorService } from './providers/name-generator.service';
import {delay} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  ownName: string;
  ownId: string;

  windows: KnownAppWindow[] = [];
  logs: string[] = [];

  newName: string;

  @HostListener('window:unload')
  unloadHandler() {
    this.multiWindowService.saveWindow();
  }

  constructor(private multiWindowService: MultiWindowService, private nameGenerator: NameGeneratorService) {
  }

  public pause(milliseconds) {
    var dt = new Date();
    while ((new Date().getTime()) - dt.getTime() <= milliseconds) { /* Do nothing */ }
  }

  ngOnInit(): void {
    this.ownId = this.multiWindowService.id;
    this.ownName = this.multiWindowService.name;
    if (this.ownName.indexOf(this.ownId) >= 0) {
      // This window still has the automatic given name, so generate a fake one for demo reasons
      // Generate a random name for the current window, just for fun
      this.multiWindowService.name = this.ownName = this.nameGenerator.getRandomFakeName();
    }
    this.newName = this.ownName;
    this.windows = this.multiWindowService.getKnownWindows();
    if (this.multiWindowService.getKnownWindows().length > 0) {
      this.multiWindowService.onMessage().subscribe((value: Message) => {
        if (value.senderId != this.ownId) {
          this.logs.unshift('Received a message from ' + value.senderId + ': ' + value.data);
        }
      });
    }

    this.multiWindowService.onWindows().subscribe(knownWindows => this.windows = knownWindows);
  }

  public sendTonsOfMessages(recipientId: string, message: string) {
    for (let i = 0; i < 5000; i++) {
      this.sendMessage(recipientId, message);
    }
  }

  public sendMessage(recipientId: string, message: string) {
    if (recipientId === this.ownId) {
      // Catch sending messages to itself. Trying to do so throws an error from multiWindowService.sendMessage()
      this.logs.unshift('Can\'t send messages to itself. Select another window.');

      return;
    }
    this.multiWindowService.sendMessage(recipientId, 'customEvent', message).subscribe(
      (messageId: string) => {
        this.logs.unshift('Message send, ID is ' + messageId);
      },
      (error) => {
        this.logs.unshift('Message sending failed, error: ' + error);
      },
      () => {
        this.logs.unshift('Message successfully delivered');
      });
  }

  public removeLogMessage(index: number) {
    this.logs.splice(index, 1);
  }

  public changeName() {
    this.multiWindowService.name = this.ownName = this.newName;
  }

  public newWindow() {
    const newWindowData = this.multiWindowService.newWindow();
    newWindowData.created.subscribe({
        next: () => {
        },
        error: (err) => {
          this.logs.unshift('An error occured while waiting for the new window to start consuming messages');
        },
        complete: () => {
          this.logs.unshift('The new window with id ' + newWindowData.windowId + ' got created and starts consuming messages');
        }
      }
    );
    window.open('?' + newWindowData.urlString);
  }

  public windowTrackerFunc(item, index) {
    return item.id;
  }
}
