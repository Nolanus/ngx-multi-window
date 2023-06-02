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

  logs: string[] = [];

  newName: string;

  constructor(private multiWindowService: MultiWindowService, private nameGenerator: NameGeneratorService) {
  }

  public pause(milliseconds) {
    var dt = new Date();
    while ((new Date().getTime()) - dt.getTime() <= milliseconds) { /* Do nothing */ }
  }

  ngOnInit(): void {
    this.ownId = this.multiWindowService.id;
    this.newName = this.ownName;
    this.multiWindowService.onMessage('data').subscribe((value: Message) => {
      if (value.senderId != this.ownId) {
        this.logs.unshift('Received a message from ' + value.senderId + ': ' + value.data);
      }
    });
  }

  public sendMessage(message: string) {
    this.multiWindowService.sendMessage("data", message);
  }

  public removeLogMessage(index: number) {
    this.logs.splice(index, 1);
  }

  public newWindow() {
    window.open('?');
  }

  public windowTrackerFunc(item, index) {
    return item.id;
  }
}
