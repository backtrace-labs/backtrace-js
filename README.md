This library has been deprecated and is replaced by https://github.com/backtrace-labs/backtrace-javascript


# ~backtrace-js~

~Backtrace error reporting tool for client-side JavaScript.~

## Usage

```js
// Import backtrace-js with your favorite package manager.
import * as backtrace from 'backtrace-js';

backtrace.initialize({
  endpoint: 'https://submit.backtrace.io/<universe>/<submit_token>/json',
});

// Later, when you have an error:
backtrace.report(new Error('something broke'));
```


## Documentation

### bt.initialize([options])

This is intended to be one of the first things your application does during
initialization. It registers a handler for `uncaughtException` which will
spawn a detached child process to perform the error report and then crash
in the same way that your application would have crashed without the handler.

#### Options

##### `endpoint`

Required.

Example: `https://backtrace.example.com:6098`.

Sets the HTTP/HTTPS endpoint that error reports will be sent to. If the user uses submit.backtrace.io - the token option is optional. By default, if the user uses a different URL (not submit.backtrace.io), then the user needs to include a token option.

##### `token`

Required if you're not using integration via submit.backtrace.io.

Example: `51cc8e69c5b62fa8c72dc963e730f1e8eacbd243aeafc35d08d05ded9a024121`.

Sets the token that will be used for authentication when sending an error
report.

##### `handlePromises`

Optional. Set to `true` to listen to the `unhandledRejection` global event and
report those errors in addition to `uncaughtException` events.

Defaults to `false` because an application can technically add a promise
rejection handler after an event loop iteration, which would cause the
`unhandledRejection` event to fire, followed by the `rejectionHandled` event
when the handler was added later. This would make the error report a false
positive. However, most applications will add rejection handlers before an
event loop iteration, in which case `handlePromises` should be set to `true`.

##### `userAttributes`

Optional. Object that contains additional attributes to be sent along with
every error report. These can be overridden on an individual report with
`report.addAttribute`.

Example:

```
{
  application: "ApplicationName",
  serverId: "foo",
}
```

##### `timeout`

Defaults to `15000`. Maximum amount of milliseconds to wait for child process
to process error report and schedule sending the report to Backtrace.

##### `allowMultipleUncaughtExceptionListeners`

Defaults to `false`. Set to `true` to not crash when another `uncaughtException`
listener is detected.

##### `disableGlobalHandler`

Defaults to `false`. If this is `false`, this module will attach an
`uncaughtException` handler and report those errors automatically before
re-throwing the exception.

Set to `true` to disable this. Note that in this case the only way errors
will be reported is if you call `bt.report(error)`.

#### `rateLimit`

Backtrace-js supports client rate limiting! You can define how many reports per one minute you want to send to Backtrace by adding the additional option to the BacktraceClientOptions object. Now, when you reach the defined limit, the client will skip the current report.

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

#### Breadcrumbs
Add information about activity in your application to your error reports by calling `leaveBreadcrumb` when events happen. The breadcrumbs will appear in the Backtrace console along with the error object. 

Example: 
```
  backtrace.leaveBreadcrumb(
    message,
    attributes,
    timestamp,
    logLevel,
    logType,
  );
```

#### Metrics support
Backtrace-JS allows to capture metrics data and send them to Backtrace. By default, the metrics support is enabled. To disable it, the user needs to set `enableMetricsSupport` to false. 

#### MetricsSubmissionUrl
Optional variable that allows to override the default URL to the metrics servers.

## Testing

```
npm install
./node_modules/.bin/browserify test/app.js --outfile test/out.js
node test/server.js
```
