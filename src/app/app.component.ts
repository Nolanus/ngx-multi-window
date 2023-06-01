import { Component, HostListener, OnInit } from '@angular/core';
import { MultiWindowService, Message, KnownAppWindow } from 'ngx-multi-window';
import { NameGeneratorService } from './providers/name-generator.service';
import {delay, Subscription} from "rxjs";

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
    this.ownId = this.multiWindowService.id;
    this.ownName = this.multiWindowService.name;
    if (this.ownName.indexOf(this.ownId) >= 0) {
      // This window still has the automatic given name, so generate a fake one for demo reasons
      // Generate a random name for the current window, just for fun
      this.multiWindowService.name = this.ownName = this.nameGenerator.getRandomFakeName();
    }
    this.newName = this.ownName;
    this.windows = this.multiWindowService.getKnownWindows();
    this.subs.add(this.multiWindowService.onMessage().subscribe((value: Message) => {
      if (value.senderId != this.ownId) {
        this.pause(10);
        console.log('Received a message from ' + value.senderId + ': ' + JSON.stringify(value.data));
      }
      console.log("Reading message...");
    }));
  }

  public pause(milliseconds) {
    var dt = new Date();
    while ((new Date().getTime()) - dt.getTime() <= milliseconds) { /* Do nothing */ }
  }

  private subs: Subscription = new Subscription();

  ngOnInit(): void {
    this.multiWindowService.onWindows().subscribe(knownWindows => this.windows = knownWindows);
  }

  public sendMessagesToAllWindows(message: string, dontSendAgain: boolean = false) {
    if (this.subs) {
      this.subs.unsubscribe();
    }
    console.log("[DEBUG] Known Windows: ", this.multiWindowService.getKnownWindows());
    for (const window of this.multiWindowService.getKnownWindows()) {
      if (window.id === this.ownId) continue;
      this.logs.unshift("Messages sent to [" + window.id + "]");
      let successCount = 0;
      for (let i=0; i < 100; i++) {
        const json = {
          type: 'UPDATE_DATA',
          value: { dataID: (i + (dontSendAgain ? 100 : 0)) }
        }
        this.multiWindowService.sendMessage(window.id, 'customEvent', json).subscribe(
          (messageId: string) => {
            console.log('Message sent [' + window.id + ']: ' + JSON.stringify(json));
          },
          (error) => {
            this.logs.unshift('Message sending failed, error: ' + error);
          },
          () => {
            console.log('Message SUCCESS sent [' + window.id + ']: ' + JSON.stringify(json));
            successCount++;
            this.logs.unshift("Successfully sent " + successCount + " messages...");
          });
      }
    }
    this.pause(2);
    if (!dontSendAgain)
      this.sendMessagesToAllWindows(message, true);
    console.log("[MAIN] Completed sends...");
  }

  public removeLogMessage(index: number) {
    this.logs.splice(index, 1);
  }

  public changeName() {
    this.multiWindowService.name = this.ownName = this.newName;
  }

  public newWindow() {
    window.open('?');
  }
  public windowTrackerFunc(item, index) {
    return item.id;
  }
}
