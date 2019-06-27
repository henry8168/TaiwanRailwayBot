function get_timestamp(dayoffset){
  var datetime = new Date();
  if(dayoffset){
    datetime.setDate(datetime.getDate() + dayoffset);
  }
  var year = datetime.getFullYear();
  var month = datetime.getMonth()+1;
  var date = datetime.getDate();
  var hour = datetime.getHours();
  var minute = datetime.getMinutes();
  var second = datetime.getSeconds();
  var timestamp = year+"/"+month+"/"+date+" "+hour+":"+minute+":"+second;
  return timestamp;
}

function get_date_num_str(dayoffset){
  var datetime = new Date();
  if(dayoffset){
    datetime.setDate(datetime.getDate() + dayoffset);
  }
  var year = datetime.getFullYear();
  var month = datetime.getMonth()+1;
  month = String(month)
  if(month.length == 1){
    month = '0'+month
  }
  var date = datetime.getDate();
  date = String(date)
  if(date.length == 1){
    date = '0'+date
  }
  var datestamp = String(year)+String(month)+String(date);
  return datestamp;
}

function record_user(update){
  var SpreadSheet = SpreadsheetApp.openById(user_info_spreadsheets_id);
  var Sheet = SpreadSheet.getSheetByName(user_using_record_sheet_name);
  var LastRow = Sheet.getLastRow();
  var received_uid = update.message.chat.id;
  var received_username = update.message.chat.username;
  if(!received_username){
    received_username = ""
  }
  var received_first_name = update.message.chat.first_name;
  var received_last_name = update.message.chat.last_name;
  if(!received_last_name){
    received_last_name = ""
  }
  //寫入資料
  Sheet.appendRow([received_uid, received_username, received_first_name, received_last_name, get_timestamp()]);
  //回傳處理完成
  return ContentService.createTextOutput(true);
}

function send_msg(uid, msg){
  var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + tg_token + "/sendMessage?text=" + encodeURIComponent(msg) + "&chat_id=" + uid + "&parse_mode=HTML");
  return response
}

function downloadFile2GD(fileName, fileURL, folderId) {
  //Reference from https://stackoverflow.com/questions/55384021/download-file-to-google-drive-folder-using-app-script
  
  var response = UrlFetchApp.fetch(fileURL);
  var fileBlob = response.getBlob()
  var fileString = fileBlob.getDataAsString()
  var folder = DriveApp.getFolderById(folderId);
  // var result = folder.createFile(fileBlob);
  var result = folder.createFile(fileName, fileString);
}

function isFileExists(filename, folderId){
  //Supplied version Mr Rebot -  testing
  var filefound=false;
  var folder = DriveApp.getFolderById(folderId);

  //Folder does not exist
  if(!folder){
    // log.TWR_DEBUG("No Folder Found");
  }
  //Folder does exist
  else{
    // log.TWR_DEBUG("Folder Found")
    var file = folder.getFilesByName(filename);
    if(!file.hasNext()){
      // log.TWR_DEBUG("No File Found");
    }
    else{
       // log.TWR_DEBUG("File Found");
       filefound=true;
    }
  }
  // log.TWR_DEBUG(filefound);
  return filefound;
}

function crash_notification(err_msg){
  if(!USE_NOTIFY_BOT){
    return 0
  }
  msg = "[TWR crash] "+PROGRAM_NAME+" crashed. err: "+err_msg
  log.TWR_ERR(msg, "tools.crash_notification")
  send_msg(Author_UID, msg)
  return 0
}

function createFileInMyFolder(exportFileName, content, folderid) {
  var folder = DriveApp.getFolderById(folderid);
  folder.createFile(exportFileName, content);
}

function delteFile(fileName, folderId) {
  files = DriveApp.getFilesByName(fileName)
  if(files.hasNext()){
    file = files.next()
    DriveApp.getFolderById(folderId).removeFile(file)
  }
}

function unZipIt(zipfilename, exportFileName, folderid) {
  var theFolder = DriveApp.getFolderById(folderid);
  var theFile = theFolder.getFilesByName(zipfilename);
  var fileBlob = theFile.next().getBlob();
  fileBlob.setContentType("application/zip");
  var unZippedfile = Utilities.unzip(fileBlob);
//  var newDriveFile = DriveApp.createFile(unZippedfile[0]);
  createFileInMyFolder(exportFileName, unZippedfile[0].getDataAsString(), folderid)
  
}

function check_and_download_json(){
  var today_json_name = get_date_num_str()+".json"
  var yesterday_json_name = get_date_num_str(-1)+".json"
  var tomorrow_json_name = get_date_num_str(1)+".json"
  
  if(!isFileExists(today_json_name, my_folder_id)){
    schedule_json_list = []
    log.TWR_INFO("JSON file today was not found. Start to download "+ today_json_name)
    file_url = get_json_file_url(today_json_name)
    downloadFile2GD(today_json_name, file_url, my_folder_id)
  }
  else if(!isFileExists(tomorrow_json_name, my_folder_id)){
    log.TWR_INFO("JSON file tomorrow was not found. Start to download "+tomorrow_json_name)
    file_url = get_json_file_url(tomorrow_json_name)
    downloadFile2GD(tomorrow_json_name, file_url, my_folder_id)
  }
  else{
    return 0
  }
  delteFile(yesterday_json_name, my_folder_id)
  return 0
}

function str2int(str_t){
  var len_str_t = str_t.length
  while(len_str_t > 1){
    if(str_t[0] == '0'){
      str_t = str_t.slice(1, len_str_t)
      len_str_t = str_t.length
      continue
    }
    break
  }
  return parseInt(str_t)
}

function user_config_item2column(item){
  var col = undefined
  var len_user_config_items_list = user_config_items_list.length
  for(var col=0; col<len_user_config_items_list; col++){
    if(user_config_items_list[col]==item){
      return col+1
    }
  }
}

function getUserConfigList(uid){
  var SpreadSheet = SpreadsheetApp.openById(user_info_spreadsheets_id);
  var Sheet = SpreadSheet.getSheetByName(user_config_sheet_name);
  var len_user_config_items_list = user_config_items_list.length
  var start_row = 1
  var obj_t = Sheet.getSheetValues(start_row, 1, 1, len_user_config_items_list)
  while(obj_t[0][0] != ""){
    if(obj_t[0][0] == uid){
      // log.TWR_DEBUG(obj_t[0])
      return obj_t[0]
    }
    start_row++
    obj_t = Sheet.getSheetValues(start_row, 1, 1, len_user_config_items_list)
  }
  return undefined
}

function getUserConfigRow(uid){
  var SpreadSheet = SpreadsheetApp.openById(user_info_spreadsheets_id);
  var Sheet = SpreadSheet.getSheetByName(user_config_sheet_name);
  var len_user_config_items_list = user_config_items_list.length
  var start_row = 1
  var obj_t = Sheet.getSheetValues(start_row, 1, 1, len_user_config_items_list)
  while(obj_t[0][0] != ""){
    if(obj_t[0][0] == uid){
      // log.TWR_DEBUG(obj_t[0])
      return start_row
    }
    start_row++
    obj_t = Sheet.getSheetValues(start_row, 1, 1, len_user_config_items_list)
  }
  return -1
}

function setUserConfigVal(row, col, val){
  var SpreadSheet = SpreadsheetApp.openById(user_info_spreadsheets_id);
  var Sheet = SpreadSheet.getSheetByName(user_config_sheet_name);
  Sheet.getRange(row, col).setValue(val)
  return 0
}

function max_split_spaces(text){
  var num = 1
  var space = ' '
  var pre_space = ' '
  while(text.search(space) >= 0){
    pre_space = space
    num++
    space += ' '
  }
  return pre_space
}


function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}