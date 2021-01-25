# backtrace-js

Backtrace error reporting tool for client-side JavaScript.

## Usage

```js
// Import backtrace-js with your favorite package manager.
import * as bt from 'backtrace-js';

bt.initialize({
  endpoint: `https://console.backtrace.io:${BACKTRACE_PORT}`,
  token: '51cc8e69c5b62fa8c72dc963e730f1e8eacbd243aeafc35d08d05ded9a024121',
});

// Later, when you have an error:
bt.report(new Error('something broke'));
```

## Documentation

### bt.initialize([options])

This is intended to be one of the first things your application does during
initialization. It registers a handler for `uncaughtException` which will
spawn a detached child process to perform the error report and then crash
in the same way that your application would have crashed without the handler.

#### Options
See [backtrace-node](https://github.com/backtrace-labs/backtrace-node#documentation)'s documentation for the complete options list.

In addition to all [backtrace-node](https://github.com/backtrace-labs/backtrace-node#documentation)'s options, Backtrace-JS includes `sampling` and `filter`.

##### `sampling`
Optional.
Sets a percentage of reports which should be sent.
For example, `sampling: 0.25` would send 25/100 reports.

##### `filter`
Optional.
Set a pre-send function which allows custom filtering of reports.
This function accepts the backtrace report object and should return `true` if the report SHOULD be sent or return `false` if the report should NOT be sent.

Example: 
```
filter: function(report) {
  if (report.attributes["error.message"] == "Script error.") {
    return  Math.random() >= 0.5;  // Sample half of this kind of report
  }
  return true;  // Otherwise, always send the report
}
```

#### Attachments
Client can optionally provide information to be treated as an attachment. Methods `report` and `reportSync` accept a string or object type which will be converted to a Blob and attached to your Backtrace error report before sending.

Example: 
```
 backtrace.report(new Error("something broke"), attributes, { items: "This will appear as an attachment." });
```

## Testing

```
npm install
./node_modules/.bin/browserify test/app.js --outfile test/out.js
node test/server.js
```
