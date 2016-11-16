# backtrace-js

Backtrace error reporting tool for client-side JavaScript.

## Usage

```js
// Import backtrace-js with your favorite package manager.
import * as bt from 'backtrace-js'

bt.initialize({
  endpoint: "https://console.backtrace.io",
  token: "51cc8e69c5b62fa8c72dc963e730f1e8eacbd243aeafc35d08d05ded9a024121",
})

// Later, when you have an error:
bt.report(new Error("something broke"));
```
