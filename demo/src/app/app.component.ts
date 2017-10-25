import { Component } from '@angular/core';
import { MultiWindowService, WindowData, Message } from 'ngx-multi-window';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app works!';

  ownName: string;
  ownId: string;

  windows: WindowData[] = [];
  logs: string[] = [];

  newName: string;

  constructor(private multiWindowService: MultiWindowService) {
    this.ownId = multiWindowService.id;
    this.ownName = multiWindowService.name;
    this.newName = this.ownName;
    this.windows = multiWindowService.getKnownWindows();

    multiWindowService.onMessage().subscribe((value: Message) => {
      this.logs.unshift('Received a message from ' + value.senderId + ': ' + value.data);
    });

    multiWindowService.onWindows().subscribe(knownWindows => this.windows = knownWindows);
  }

  public sendMessage(recipientId: string, message: string) {
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

  public changeName() {
    this.multiWindowService.name = this.newName;
  }

  public newWindow() {
    let newWindowData = this.multiWindowService.newWindow();
    newWindowData.created.subscribe(() => {
      },
      (err) => {
        this.logs.unshift('An error occured while waiting for the new window to start consuming messages');
      },
      () => {
        this.logs.unshift('The new window with id ' + newWindowData.windowId + ' got created and starts consuming messages');
      }
    );
    window.open('?' + newWindowData.urlString);
  }
}
