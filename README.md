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

See [backtrace-node](https://github.com/backtrace-labs/backtrace-node#documentation)'s documentation.

### bt.initialize([options])

This is intended to be one of the first things your application does during
initialization. It registers a handler for `uncaughtException` which will
spawn a detached child process to perform the error report and then crash
in the same way that your application would have crashed without the handler.

#### Options
See [backtrace-node](https://github.com/backtrace-labs/backtrace-node#documentation)'s documentation for the complete options list.

In Addition to all [backtrace-node](https://github.com/backtrace-labs/backtrace-node#documentation)'s options, Backtrace-JS includes `sampling` and `filter`.

##### `sampling`
Optional.
Sets a percentage of reports which should be send.
For example, `sampling: 0.25` would send 25/100 of reports/

##### `filter`
Optional.
Set a pre-send function which allows custom filtering of reports.

Example: 
```
filter: function(report) {
  if (report.attributes["error.message"] == "Script Error.") {
    return  Math.random() >= 0.5;  // Sample half of this kind of report
  }
  return true;
}
```

## Testing

```
npm install
./node_modules/.bin/browserify test/app.js --outfile test/out.js
node test/server.js
```

## Making a release

1.  Update package.json with version number
2.  Update `var myVersion = "x.y.z";` to match package.json
3.  Create a git tag
4.  `npm publish`
