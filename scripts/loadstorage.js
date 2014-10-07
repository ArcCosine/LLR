(function(global){

  //define
  var _BROWSER = !!global.self;
  //var _NODE_JS = !!global.process;

  //interface
  function LLRLoadStorage(){
      this.init();
  }
  LLRLoadStorage.prototype.init = LLRLoadStorageInit;

  //implements
  function LLRLoadStorageInit() {

      var url = 'source/export.xml';
      // Load済みの場合
      if( window.localStorage.getItem("LLR") ){
          return;
      } else {

          $.ajax({
              url: url,
              async: true,
              cache: false,
              dataType: 'xml',
              error: function(){
                  console.log('And die Arc Cosine, please tweet to Twitter:)');
              },
              success: function(xml){
                  var outlines = xml.getElementsByTagName("outline");
                  var datas = [];
                  for( var i=0, iz = outlines.length; i<iz; i++ ){
                      var one = outlines[i];
                      var xmlUrl = one.getAttribute("xmlUrl");
                      var title = one.getAttribute("title");
                      if( xmlUrl ){
                          var data = {}
                          data[xmlUrl] = title;
                          datas.push(data);
                      }
                  }
                  window.localStorage.setItem("LLR",JSON.stringify(datas));
              }
          });
      }
  }

  //export
  global.LLRLoadStorage = LLRLoadStorage;

})(this.self || global);  //this.self as window object.
