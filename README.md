# ngx-multi-window [![npm version](https://img.shields.io/npm/v/ngx-multi-window.svg?style=flat)](https://www.npmjs.com/package/ngx-multi-window) [![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

Pull-based cross-window communication for multi-window angular applications

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b175dcd8585a42bdbdb9c1ee2a313b3b)](https://www.codacy.com/app/sebastian-fuss/ngx-multi-window?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Nolanus/ngx-multi-window&amp;utm_campaign=Badge_Grade)

## Features

- Send messages between different tabs/windows that are running the angular app
- Message receive notification for sending tab/window
- Automatic detection/registration of new tabs/windows

## Setup

First you need to install the npm module:
```sh
npm install ngx-multi-window --save
```

For older angular versions you may install previous versions of this library:

| ngx-multi-window version | compatible angular version |
|--------------------------|----------------------------|
| `0.5`                    | `14`                       |
| `0.4.1`                  | `8 - 13`                   |
| `0.3.2`                  | `7`                        |
| `0.2.4`                  | `6`                        |

Then add the `MultiWindowModule` to the imports array of your application module:

```typescript
import {MultiWindowModule} from 'ngx-multi-window';

@NgModule({
    imports: [
        /* Other imports here */
        MultiWindowModule
        ]
})
export class AppModule {
}
```

Finally, you need to specify how your application should load the ngx-multi-window library:

## Usage

Inject the `MultiWindowService` into your component or service.

```typescript
import {MultiWindowService} from 'ngx-multi-window';

export class AppComponent {
    constructor(private multiWindowService: MultiWindowService) {
        // use the service 
    }
}   
```

### Configuration

You may inject a custom `MultiWindowConfig` object when importing the `MultiWindowModule` into your application.

```typescript
@NgModule({
    imports: [
       ...
       MultiWindowModule.forRoot({ heartbeat: 542 })
     ],
  })
```

Check the description of the [MultiWindowConfig interface](https://github.com/Nolanus/ngx-multi-window/blob/master/projects/ngx-multi-window/src/lib/types/multi-window.config.ts) properties for options.
The [default options](https://github.com/Nolanus/ngx-multi-window/blob/master/projects/ngx-multi-window/src/lib/providers/config.provider.ts#L6) are
```typescript
{
  keyPrefix: 'ngxmw_',
  heartbeat: 1000,
  newWindowScan: 5000,
  messageTimeout: 10000,
  windowTimeout: 15000,
  windowSaveStrategy: WindowSaveStrategy.NONE,
}
```

### Window ID and name

Every window has a unique, unchangeable id which can be accessed via `multiWindowService.id`.
In addition to that every window as a changeable name which can be get/set 
via `multiWindowService.name`.

### Receive messages

Receive messages addressed to the current window by subscribing to the observable returned from
`multiWindowService.onMessages()`:

```typescript
import { MultiWindowService, Message } from 'ngx-multi-window';

class App {
    constructor(private multiWindowService: MultiWindowService) {
        multiWindowService.onMessage().subscribe((value: Message) => {
          console.log('Received a message from ' + value.senderId + ': ' + value.data);
        });
    } 
}
```

### Send messages

Send a message by calling `multiWindowService.sendMessage()`:

```typescript
import { MultiWindowService, WindowData, Message } from 'ngx-multi-window';

class App {
    constructor(private multiWindowService: MultiWindowService) {
        const recipientId: string; // TODO
        const message: string; // TODO
        multiWindowService.sendMessage(recipientId, 'customEvent', message).subscribe(
          (messageId: string) => {
            console.log('Message send, ID is ' + messageId);
          },
          (error) => {
            console.log('Message sending failed, error: ' + error);
          },
          () => {
            console.log('Message successfully delivered');
          });
    }
}
```
The message returns an observable which will resolve with a message id once the message has been send (= written to local storage).
The receiving window will retrieve the message and respond with a `MessageType.MESSAGE_RECEIVED` typed message. 
The sending window/app will be informed by finishing the observable.

In case no `MessageType.MESSAGE_RECEIVED` message has been received by the sending window 
within a certain time limit (`MultiWindowConfig.messageTimeout`, default is 10s) 
the message submission will be canceled. The observable will be rejected and the 
initial message will be removed from the current windows postbox. 

### Other windows

To get the names and ids of other window/app instances the `MultiWindowService` offers two methods:

`multiWindowService.onWindows()` returns an observable to subscribe to in case you require periodic updates of the 
fellow windows. The observable will emit a new value every time the local storage has been scanned for the windows. 
This by default happens every 5 seconds (`MultiWindowConfig.newWindowScan`).

Use `multiWindowService.getKnownWindows` to return an array of `WindowData`.

### New windows

No special handling is necessary to open new windows. Every new window/app will register itself 
by writing to its key in the local storage. Existing windows will identify new windows 
after `MultiWindowConfig.newWindowScan` at the latest.

The `MultiWindowService` offers a convenience method `newWindow()` which provides details for the 
new window's start url. If used the returned observable can be utilized to get notified 
once the new window is ready to consume/receive message. 

### Save window name

The library comes with a mechanism to save the window id using the browser's `window.name` property. This 
property is persisted on page reloads, resulting in the same tab/window running your angular application to keep 
the ngx-multi-window id even when reloading the page.
Note: Only the window id is persisted, the customizable window name and messages are kept in the local storage,
but are automatically rediscovered by the new window once it starts consuming messages.

To save the window id, set the respective config property `nameSafeStrategy` to the desired value. Additionally 
one needs to call `saveWindow()` function e.g. during window unloading by attaching a `HostListener` in your 
main AppComponent.

```typescript
@HostListener('window:unload')
unloadHandler() {
  this.multiWindowService.saveWindow();
}
```

## Communication strategy

This library is based on "pull-based" communication. Every window periodically checks the local storage for messages addressed to itself.
For that reason every window has its own key in the local storage, whose contents/value looks like:

```json
{"heartbeat":1508936270103,"id":"oufi90mui5u5n","name":"AppWindow oufi90mui5u5n","messages":[]}
```

The heartbeat is updated every time the window performed a reading check on the other window's local storage keys.

Sending message from sender A to recipient B involves the following steps:
- The sender A writes the initial message (including the text and recipient id of B) into the "messages" array located at its own local storage key
- The recipient window B reads the messages array of the other windows and picks up a message addressed to itself
- B places a "MESSAGE_RECEIVED" message addressed to A in its own messages array
- A picks up the "MESSAGE_RECEIVED" message in B's message array and removes the initial message from its own messages array
- B identifies that the initial message has been removed from A's messages array and removes the receipt message from its own messages array

![Communication Strategy showcase](communication.gif)

## Example App

This project contains a demo application that has been adapted to showcase the functionality of ngx-multi-window. 
Run the demo app by checking out that repository and execute the following command in the project root directory:

 ```
npm install
ng serve
 ```
 
## TODO

- Tests and cross browser testing

## License

[MIT](LICENSE)
