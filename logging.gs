var Logging = function(save_lv, use_sheet){
  this.use_sheet = use_sheet
  this.save_lv = save_lv;
  this.DEBUG = 4
  this.INFO  = 3
  this.WARN  = 2
  this.ERROR = 1
  if(this.use_sheet == true){
    this.log_spreadsheet_id = "YourGoogleDriveSheetIdToSaveLog"
    this.log_spreadsheet_sheetname = "log"
    this.SpreadSheet = SpreadsheetApp.openById(this.log_spreadsheet_id);
    this.Sheet = this.SpreadSheet.getSheetByName(this.log_spreadsheet_sheetname);
    this.module_col = 1
    this.msg_col = 2
    this.timestamp_col = 3
  }
  else{
    this.log_document_id = "YourGoogleDriveDocIdToSaveLog"
    this.body = DocumentApp.openById(this.log_document_id).getBody();
    this.text = this.body.editAsText();
  }
  
  this.TWR_ERR = function(msg, module){
    if(this.ERROR > this.save_lv){
      return 0;
    }
    if(this.use_sheet == true){
      if(module == undefined){
        this.Sheet.appendRow(["", msg, get_timestamp()]);
      }
      else{
        this.Sheet.appendRow([module, msg, get_timestamp()]);
      }
    }
    else{
      this.text.appendText("[TWR.erro] ");
      if(module == undefined){
        this.text.appendText(msg);
      }
      else{
        this.text.appendText(module+" "+msg);
      }
      this.text.appendText(" - "+get_timestamp()+'\n');
    }
    return 0;
  }
  
  this.TWR_WARN = function(msg, module){
    if(this.WARN > this.save_lv){
      return 0;
    }
    if(this.use_sheet == true){
      if(module == undefined){
        this.Sheet.appendRow(["", msg, get_timestamp()]);
      }
      else{
        this.Sheet.appendRow([module, msg, get_timestamp()]);
      }
    }
    else{
      this.text.appendText("[TWR.warn] ");
      if(module == undefined){
        this.text.appendText(msg);
      }
      else{
        this.text.appendText(module+" "+msg);
      }
      this.text.appendText(" - "+get_timestamp()+'\n');
    }
    return 0;
  }
  
  this.TWR_INFO = function(msg, module){
    if(this.INFO > this.save_lv){
      return 0;
    }
    if(this.use_sheet == true){
      if(module == undefined){
        this.Sheet.appendRow(["", msg, get_timestamp()]);
      }
      else{
        this.Sheet.appendRow([module, msg, get_timestamp()]);
      }
    }
    else{
      this.text.appendText("[TWR.info] ");
      if(module == undefined){
        this.text.appendText(msg);
      }
      else{
        this.text.appendText(module+" "+msg);
      }
      this.text.appendText(" - "+get_timestamp()+'\n');
    }
    return 0;
  }
  
  this.TWR_DEBUG = function(msg, module){
    if(this.DEBUG > this.save_lv){
      return 0;
    }
    if(this.use_sheet == true){
      if(module == undefined){
        this.Sheet.appendRow(["", msg, get_timestamp()]);
      }
      else{
        this.Sheet.appendRow([module, msg, get_timestamp()]);
      }
    }
    else{
      this.text.appendText("[TWR.debg] ");
      if(module == undefined){
        this.text.appendText(msg);
      }
      else{
        this.text.appendText(module+" "+msg);
      }
      this.text.appendText(" - "+get_timestamp()+'\n');
    }
    return 0;
  }
  
};

var log = new Logging(4, true);