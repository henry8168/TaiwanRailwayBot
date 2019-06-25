var Logging = function(save_lv){
  this.log_document_id = "YourGoogleDriveDocIdToSaveLog"
  this.save_lv = save_lv;
  this.DEBUG = 4
  this.INFO  = 3
  this.WARN  = 2
  this.ERROR = 1
  this.body = DocumentApp.openById(this.log_document_id).getBody();
  this.text = this.body.editAsText();
  
  this.TWR_ERR = function(msg, module){
    if(this.ERROR > this.save_lv){
      return 0;
    }
    this.text.appendText("[TWR.erro] ");
    if(module == undefined){
      this.text.appendText(msg);
    }
    else{
      this.text.appendText(module+" "+msg);
    }
    this.text.appendText(" - "+get_timestamp()+'\n');
    return 0;
  }
  
  this.TWR_WARN = function(msg, module){
    if(this.WARN > this.save_lv){
      return 0;
    }
    this.text.appendText("[TWR.warn] ");
    if(module == undefined){
      this.text.appendText(msg);
    }
    else{
      this.text.appendText(module+" "+msg);
    }
    this.text.appendText(" - "+get_timestamp()+'\n');
    return 0;
  }
  
  this.TWR_INFO = function(msg, module){
    if(this.INFO > this.save_lv){
      return 0;
    }
    this.text.appendText("[TWR.info] ");
    if(module == undefined){
      this.text.appendText(msg);
    }
    else{
      this.text.appendText(module+" "+msg);
    }
    this.text.appendText(" - "+get_timestamp()+'\n');
    return 0;
  }
  
  this.TWR_DEBUG = function(msg, module){
    if(this.DEBUG > this.save_lv){
      return 0;
    }
    this.text.appendText("[TWR.debg] ");
    if(module == undefined){
      this.text.appendText(msg);
    }
    else{
      this.text.appendText(module+" "+msg);
    }
    this.text.appendText(" - "+get_timestamp()+'\n');
    return 0;
  }
  
};

var log = new Logging(4);
