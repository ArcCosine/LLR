(function(global){

  //define
  var _BROWSER = !!global.self;
  //var _NODE_JS = !!global.process;
  var counter = 0;

  //interface
  function LLRRender(){
      this.init();
      this.loadStorage();
      // this.renderSide();
      // this.renderMain();
  }
  LLRRender.prototype.init = LLRRenderInit;
  LLRRender.prototype.loadStorage = LLRRenderLoadStorage;

  //implements
  function LLRRenderInit() {
      var render = $('#render');

      // Render Left Side
      var left = $(render).append("<div id='side'></div>");
      // Render Main
      var main = $(render).append("<div id='main'></div>");
  }

  function LLRRenderLoadStorage(){
      counter++;
      var data = window.localStorage.getItem("LLR");
      var LLR = JSON.parse(data);

      // ToDo
      // Load保証
      if( !LLR && counter < 10 ){
          counter++;
          setTimeout(LLRRenderLoadStorage, 160);
          return;
      }


      var sideDiv = [];
      var mainDiv = [];
      for(var i = 0, iz = LLR.length; i<iz; i++ ){
          var one = LLR[i];
          var url = Object.keys(one)[0];
          var title = one[url];

          sideDiv.push("<div id='feed" + i + "'>" + title + "</div>");
          mainDiv.push("<div id='main" + i + "'></div>");

          $.ajax({
              url: url,
              async: true,
              cache: false,
              dataType: 'xml',
              error: function(){
                  console.log('And die Arc Cosine, please tweet to Twitter:)');
              },
              success: function(xml){
                  console.log(xml);
              }
          });

          // debug
          if( i > 5 ){
              break;
          }
      }
      $("#side").append(sideDiv.join(""));
      $("#main").append(mainDiv.join(""));
  }

  //export
  global.LLRRender = LLRRender;

})(this.self || global);  //this.self as window object.
