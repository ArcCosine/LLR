(function(global){

  //define
  var _BROWSER = !!global.self;
  //var _NODE_JS = !!global.process;

  //interface
  function LLRTouchEvent(){
  }
  LLRTouchEvent.prototype.init = LLRTouchEventInit;

  //implements
  function LLRTouchEventInit() {
  }

  //export
  global.LLRTouchEvent = LLRTouchEvent;

})(this.self || global);  //this.self as window object.
