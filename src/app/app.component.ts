import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { NameGeneratorService } from "./providers/name-generator.service";
import { AppWindow } from "../../projects/ngx-multi-window/src/lib/types/window.type";
import { MultiWindowService } from "../../projects/ngx-multi-window/src/lib/providers/multi-window.service";
import { MultiWindowMessage } from "../../projects/ngx-multi-window/src/lib/types/message.type";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  ownName: string = "";
  ownId: string = "";

  logs: string[] = [];

  newName: string = "";

  windows: AppWindow[] = [];

  private subs: Subscription = new Subscription();

  constructor(private multiWindowService: MultiWindowService, private changeDetectorRef: ChangeDetectorRef, private nameGenerator: NameGeneratorService) {
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
    //this.multiWindowService.subscribe();
    this.subs.add(this.multiWindowService.onMessage().subscribe((value: MultiWindowMessage) => {
      if (value.sender != this.ownId) {
        this.logs.unshift('Received a message from ' + value.sender + ': ' + value.data);
        this.changeDetectorRef.detectChanges();
      }
    }));
    this.subs.add(this.multiWindowService.onWindows().subscribe((appWindows) => {
      this.windows = appWindows;
      this.changeDetectorRef.detectChanges();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public sendMessage(message: string, recipientId: string) {
    this.multiWindowService.sendMessage(message, recipientId || null);
  }

  public removeLogMessage(index: number) {
    this.logs.splice(index, 1);
  }

  public newWindow() {
    window.open('?');
  }
}
