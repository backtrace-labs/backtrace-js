var bt = require("../lib/index");
bt.initialize({
  token: "my test token",
  endpoint: "http://localhost:11369"
  // sampling: 0.25,  // Should send 25/100 caught errors
  // filter: function(report) {
  //   if (report.attributes["error.message"] == "Script Error.") {
  //     var shouldSend = Math.random() >= 0.5;
  //     return shouldSend;
  //   }
  //   return true;
  // }
});

var btnDom = document.getElementById("error-button");

btnDom.addEventListener("click", onBtnClick, false);

function onBtnClick(ev) {
  badFnCall();
}
