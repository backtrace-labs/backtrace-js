var bt = require('../lib/index');
bt.initialize({
  token: "my test token",
  endpoint: "http://localhost:11369",
});

var btnDom = document.getElementById('error-button');

btnDom.addEventListener('click', onBtnClick, false);

function onBtnClick(ev) {
  badFnCall()
}
