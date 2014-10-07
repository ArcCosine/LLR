(function(global){

  //define
  var _BROWSER = !!global.self;
  //var _NODE_JS = !!global.process;

  //interface
  function LLRKeyboardEvent(){
  }
  LLRKeyboardEvent.prototype.init = LLRKeyboardEventInit;

  //implements
  function LLRKeyboardEventInit() {
  }

  //export
  global.LLRKeyboardEvent = LLRKeyboardEvent;

})(this.self || global);  //this.self as window object.
