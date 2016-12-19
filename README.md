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

## Documentation

TODO

## Testing

```
npm install
./node_modules/.bin/browserify test/app.js --outfile test/out.js
node test/server.js
```

## Making a release

1. Update package.json with version number
2. Update `var myVersion = "x.y.z";` to match package.json
3. Create a git tag
4. `npm publish`
