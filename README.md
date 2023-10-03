# ngx-multi-window-communication [![npm version](https://img.shields.io/npm/v/ngx-multi-window.svg?style=flat)](https://www.npmjs.com/package/ngx-multi-window) [![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

Cross-window communication for multi-window angular applications

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)

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
| `1.0`                    | `16`                       |
| `0.6.1`                  | `16`                       |
| `0.6`                    | `15`                       |
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

### Window ID and name

Every window has a unique, unchangeable id which can be accessed via `multiWindowService.getMyWindow().id`.
In addition to that every window as a changeable name which can be get/set 
via `multiWindowService.getMyWindow().name`.

### Receive messages

**IMPORTANT: To receive messages, you must run the method `multiWindowService.listen(broadcastChannelId: string)` for the multiWindowService to know it should listen to the channel.**

Receive messages addressed to the current window by subscribing to the observable returned from
`multiWindowService.onMessage(broadcastChannelId: string)`:

```typescript
import { MultiWindowService, Message } from 'ngx-multi-window';

class App {
    constructor(private multiWindowService: MultiWindowService) {
        multiWindowService.listen("channelId");
        multiWindowService.onMessage("channelId").subscribe((value: Message) => {
          console.log('Received a message from ' + value.senderId + ': ' + value.data);
        });
    } 
}
```

### Send messages

Send a message by calling `multiWindowService.sendMessage()`:

```typescript
import { MultiWindowService, WindowData, MessageTemplate } from 'ngx-multi-window';

class App {
    constructor(private multiWindowService: MultiWindowService) {
        const recipientId: string; // TODO
        const message: string; // TODO
        multiWindowService.sendMessage({
          data: message,
          type: MessageType.SPECIFIC_WINDOW,
          recipientId: recipientId
        } as MessageTemplate);
    }
}
``` 

### Other windows

To get the names and ids of other window/app instances the `MultiWindowService` offers two methods:

`multiWindowService.onWindows()` returns an observable to subscribe to in case you require periodic updates of the fellow windows. The observable will emit a new value every time a new window has been created or a window has been destroyed...

Use `multiWindowService.getKnownWindows()` to return an array of `KnownAppWindow`.

### New windows

No special handling is necessary to open new windows. Every new window/app will register itself. Existing windows will identify new windows.

## Example App

This project contains a demo application that has been adapted to showcase the functionality of ngx-multi-window. 
Run the demo app by checking out that repository and execute the following command in the project root directory:

 ```
npm install
ng serve
 ```

## License

[MIT](LICENSE)
