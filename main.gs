var schedule_json_list = []
var station_name2code = {}
var car_class_dict = {}
function doPost(e){
  try {
    var update = JSON.parse(e.postData.contents);
    if(update.message){
      var received_msg = update.message.text
      if(received_msg && update.message.chat){
        var received_uid = update.message.chat.id
        send_msg(received_uid, "收到訊息，開始處理...")
      }
    }
    check_and_download_json()
    var today_date = get_date_num_str()
    if(isEmpty(schedule_json_list)){
      schedule_json_list = get_json_list()
    }
    if(initial(station_name2code, car_class_dict) < 0){
      log.TWR_ERR("initial() failed.", "main.main")
      release()
      return -1
    }
    log.TWR_DEBUG("===========================================================")
    if(echo(update, today_date, station_name2code, schedule_json_list, car_class_dict) < 0){
      log.TWR_ERR("echo() failed.", "main.main")
      release()
      return -1
    }
  }
  catch (err){
    log.TWR_ERR(err, "doPost");
    crash_notification(err)
  }
}

function echo(update, today_date, table_name2code, json_list_t, car_class_dict){
  var received_msg = update.message.text
  var received_uid = update.message.chat.id
  var ret = 0
  if(typeof table_name2code != "object"){
    log.TWR_ERR("Wrong table_name2code type.", "main.echo")
    ret = -1
  }
  else if(typeof json_list_t != "object"){
    log.TWR_ERR("Wrong json_list_t type.", "main.echo")
    ret = -1
  }
  else if(update.message){  // your bot can receive updates without messages
    var received_uid = undefined
    var received_username = undefined
    var received_firstname = undefined
    var received_msg = update.message.text
    if(update.message.chat){
      received_uid = update.message.chat.id
      received_username = update.message.chat.username
      received_firstname = update.message.chat.first_name
    }
    var log_msg_postfix = ", UID: "+received_uid+", username: "+received_username+", First name: "+received_firstname
    var msg = ""
    if(received_uid < 0){
      msg = "不支援群組"
      log.TWR_INFO(msg+log_msg_postfix, "main.shortenUrl")
      return 0
    }
    else if(received_msg == undefined){
      msg = "奇怪的訊息"
      send_msg(received_uid, msg)
      log.TWR_INFO(msg+log_msg_postfix, "main.echo")
      return 0
    }
    var this_user_config_list = getUserConfigList(received_uid)
    for(var time=0; time<MAX_TRY && !this_user_config_list; time++){
      var SpreadSheet = SpreadsheetApp.openById(user_info_spreadsheets_id);
      var Sheet = SpreadSheet.getSheetByName(user_config_sheet_name);
      //寫入資料
      Sheet.appendRow([received_uid, "", true]);
      //再次抓取
      this_user_config_list = getUserConfigList(received_uid)
      //處理完成
      ContentService.createTextOutput(true);
    }
    if(received_msg.search("/help") == 0 || received_msg.search("/start") == 0){
      log.TWR_INFO(received_msg + log_msg_postfix, "main.echo")
      send_msg(received_uid, help_msg)
      ret = 0
    }
    else{
      // show all or show less
      if(received_msg.search("/show_less") == 0 || received_msg.search("/show_all") == 0){
        user_config_row = getUserConfigRow(received_uid)
        setUserConfigVal(user_config_row, user_config_item2column("show_only_next_20_classes"), received_msg.search("/show_less")==0)
        this_user_config_list = getUserConfigList(received_uid)
        var last_valid_input = this_user_config_list[user_config_item2column("last_valid_input")-1]
        input_stations = last_valid_input.split(max_split_spaces(last_valid_input))
      }
      else{
        input_stations = received_msg.split(max_split_spaces(received_msg))
      }
      
      // Reply to the message
      len_input_stations = input_stations.length
      if(len_input_stations > 2 || len_input_stations < 2){
                msg = "車站數不正確，請輸入兩個車站名。訊息: "+received_msg
                send_msg(received_uid, msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
      }
      else if(!(input_stations[0] in table_name2code) || !(input_stations[1] in table_name2code)){
                msg = "查無車站名稱，請輸入兩站正確的車站。訊息: "+received_msg
                send_msg(received_uid, msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
      }
      else if(table_name2code[input_stations[0]] == table_name2code[input_stations[1]]){
                msg = "相同的車站，請輸入兩個不同車站。訊息: "+received_msg
                send_msg(received_uid, msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
      }
      else{
        msg = "收到訊息: "+received_msg
        var log_msg = msg + log_msg_postfix
        log.TWR_INFO(log_msg, "main.echo")
        
        var len_json_list_t = json_list_t.length
        var src_station_name = input_stations[0]
        var dst_station_name = input_stations[1]
        var src_station_code = table_name2code[src_station_name]
        var dst_station_code = table_name2code[dst_station_name]
        var reply_train_msg_list = []
        var reply_train_msg_str = ""
        
        for(var indexi=0; indexi<len_json_list_t; indexi++){
          var reply_train_single_str = ""
          var src_station_time_info = {}
          var dst_station_time_info = {}
          var len_json_list_t_indexi_TimeInfos = json_list_t[indexi]["TimeInfos"].length
          for(var indexj=0; indexj<len_json_list_t_indexi_TimeInfos; indexj++){
            if(isEmpty(src_station_time_info) && (json_list_t[indexi]["TimeInfos"][indexj]["Station"] == src_station_code)){
              src_station_time_info = json_list_t[indexi]["TimeInfos"][indexj]
            }
            else if(!isEmpty(src_station_time_info) && isEmpty(dst_station_time_info) && json_list_t[indexi]["TimeInfos"][indexj]["Station"] == dst_station_code){
              dst_station_time_info = json_list_t[indexi]["TimeInfos"][indexj]
              break
            }
          }
          if(!isEmpty(src_station_time_info) && !isEmpty(dst_station_time_info)){
            var len_src_station_time_info_DEPTime = src_station_time_info["DEPTime"].length
            var len_dst_station_time_info_DEPTime = dst_station_time_info["ARRTime"].length
            reply_train_single_str += src_station_time_info["DEPTime"].slice(0, len_src_station_time_info_DEPTime-3)+"  "+dst_station_time_info["ARRTime"].slice(0, len_dst_station_time_info_DEPTime-3)+"  "
            var car_class_result = (car_class_dict[json_list_t[indexi]["CarClass"]])
            if(car_class_result==undefined){
              car_class_code_str = json_list_t[indexi]["CarClass"]
              reply_train_single_str += car_class_code_str
            }
            else{
              var car_class_name_str = car_class_result["KEY_CAR_CLASS_NAME_ZH_TW"]
              reply_train_single_str += car_class_name_str
            }
            reply_train_msg_list.push(reply_train_single_str)
          }
        }
        if(received_uid != Author_UID){
          if(record_user(update) < 0){
            log.TWR_ERR("append_user_info() failed.", "main.echo")
            return -1
          }
        }
        var sorted_reply_train_msg_list = reply_train_msg_list_to_dict(reply_train_msg_list)
        if(isEmpty(sorted_reply_train_msg_list)){
          msg = "查無班次"
          log.TWR_INFO(msg)
          send_msg(received_uid, msg)
          ret = 0
        }
        else{
          var will_show_only_next_20_classes = this_user_config_list[user_config_item2column("show_only_next_20_classes")-1]
          var head_str = today_date.slice(0,4)+"/"+today_date.slice(4,6)+"/"+today_date.slice(6,8)+"\n"+src_station_name+" -> "+dst_station_name
          // log.TWR_INFO("Reply the train info: ")
          // log.TWR_DEBUG(sorted_reply_train_msg_list)
          var len_reply_train_msg_list = sorted_reply_train_msg_list.length
          var shown_max_classes = -1
          if(will_show_only_next_20_classes && len_reply_train_msg_list > 20){
            shown_max_classes = 20
          }
          else{
            shown_max_classes = len_reply_train_msg_list
          }
          var sent_classes_count = 0
          for(var index=0; index<shown_max_classes; index++){
            if(index>0 && index%20 == 0){
              var len_reply_train_msg_str = reply_train_msg_str.length
              var reply_train_msg_str = reply_train_msg_str.slice(0, len_reply_train_msg_str-1)
              // log.TWR_INFO("\n"+head_str+"\n"+reply_train_msg_str)
              send_msg(received_uid, head_str+'\n'+reply_train_msg_str)
              reply_train_msg_str = ""
            }
            reply_train_msg_str += (sorted_reply_train_msg_list[index]+"\n")
            sent_classes_count+=1
          }
          if(reply_train_msg_str){
            var len_reply_train_msg_str = reply_train_msg_str.length
            reply_train_msg_str = head_str+'\n'+reply_train_msg_str.slice(0, len_reply_train_msg_str-1)
            // log.TWR_INFO("\n"+reply_train_msg_str)
            send_msg(received_uid, reply_train_msg_str)
          }
          ret = 0
        }
        
        log.TWR_INFO(sent_classes_count+" class(es) were sent to the user."+log_msg_postfix)
        if(received_msg.search("/")<0){
          if(setUserConfigVal(getUserConfigRow(received_uid), user_config_item2column("last_valid_input"), received_msg) < 0){
            log.TWR_ERR("setUserConfigVal() failed.", "main.echo")
            return -1
          }
        }
        if(this_user_config_list[user_config_item2column("show_only_next_20_classes")-1]){
          msg = "顯示全部? /show_all"
        }
        else{
          msg = "只顯示最多 20 班? /show_less"
        }
        send_msg(received_uid, msg)
      }
    }
  }
  return ret
}

function reply_train_msg_list_to_dict(msg_list){
  var msg_dict = {}
  var ordered_msg_list = []
  var len_msg_list = msg_list.length
  for(var index=0; index<len_msg_list; index++){
    var key = -1
    var line_list = msg_list[index].split(' ')
    var len_line_list = line_list.length
    for(var i=0; i<len_line_list; i++){
      if(line_list[i].search(':') >= 0){
        key = str2int(line_list[i].replace(':', ''))
        msg_dict[key] = msg_list[index]
        break
      }
    }
  }
  var datetime = new Date();
  var hour = datetime.getHours();
  var minute = datetime.getMinutes();
  if(String(hour).length==1){
    hour = '0'+String(hour)
  }
  if(String(minute).length==1){
    minute = '0'+String(minute)
  }
  var time_int = str2int(String(hour)+String(minute));
  for(var i=0; i<2400; i+=100){
    for(var j=0; j<60; j++){
      key = i+j
      if((key in msg_dict) && key >= time_int){
        ordered_msg_list.push(msg_dict[key])
      }
    }
  }
  return ordered_msg_list
}



function get_json_file_url(file_name){
    var taiwan_railway_administration_url = "https://ods.railway.gov.tw"
    var json_list_url = taiwan_railway_administration_url + "/tra-ods-web/ods/download/dataResource/railway_schedule/JSON/list"
    var response = UrlFetchApp.fetch(json_list_url);
    var html = response.getContentText()
    var html_list = html.split('\n')
    var target_line = ""
    var len_html_list = html_list.length
    for(var index=0; index<len_html_list; index++){
        if(html_list[index].search(file_name) >= 0){
            target_line = html_list[index]
            break
        }
    }
    if(target_line==""){
        log.TWR_ERR("No such file name.")
        return ""
    }
    var left_quotation_mark_index = target_line.search('\"')
    var len_target_line = target_line.length
    var right_quotation_mark_index = (target_line.slice(left_quotation_mark_index+1, len_target_line)).search('\"')
    right_quotation_mark_index += left_quotation_mark_index+1
    return taiwan_railway_administration_url + target_line.slice(left_quotation_mark_index+1, right_quotation_mark_index)
}
    
    
    

function get_json_list(){
  today_file_date = get_date_num_str()
  today_file_name = today_file_date +".json"
  tomorrow_file_name = get_date_num_str(1)+".json"
  yesturday_file_name = get_date_num_str(-1)+".json"
  
  var folder = DriveApp.getFolderById(my_folder_id);
  var files = folder.getFiles();
  var file = undefined
  var file_t = undefined
  while(files.hasNext()){
    file_t = files.next()
    if(today_file_name == file_t.getName()){
      file = file_t
      break
    }
  }
  file_blob = file.getBlob()
  file_str = file_blob.getDataAsString()
  json_content = JSON.parse(file_str)
  return json_content["TrainInfos"]
}

function Tai2Tai(str_t){
  if(str_t.search("臺") >= 0){
    return str_t.replace("臺", "台")
  }
  if(str_t.search("台") >= 0){
    return str_t.replace("台", "臺")
  }
}

function setup_station_code_dict(table){
  if(typeof table != "object"){
    log.TWE_RR("Wrong input type.", "main.setup_station_code_dict")
    return -1
  }
    
  var stations_code_url = "https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip111/view"
  var response = undefined
  try{
    response = UrlFetchApp.fetch(stations_code_url);
  }
  catch (err){
    var msg = "政府網站目前不可用： "+stations_code_url
    log.TWR_DEBUG(msg, "main.setup_station_code_dict")
    send_msg(Author_UID, msg)
    return -1
  }
  var html = response.getContentText()
  var html_list = html.split('\n')
  var train_code_html_list = []
  var len_html_list = html_list.length
  for(var index=0; index<len_html_list; index++){
    if(html_list[index].search("traincode_name") >= 0 || html_list[index].search("traincode_code") >= 0){
      train_code_html_list.push(html_list[index])
    }
  }
  
  var len_train_code_html_list = train_code_html_list.length
  if(len_train_code_html_list == 0){
    var msg = "無法取得火車代碼資料： "+stations_code_url
    log.TWR_DEBUG(msg, "main.setup_station_code_dict")
    send_msg(Author_UID, msg)
    return -1
  }
    
  var right_dive_str = "</div>"
  var left_name_string = "<div class=\"traincode_name1\">"
  var left_name_string_len = left_name_string.length
  var left_code_string = "<div class=\"traincode_code1\">"
  var left_code_string_len = left_code_string.length
  for(var index=0; index < len_train_code_html_list; index+=2){
    left_name_index = train_code_html_list[index].search(left_name_string)
    right_index = train_code_html_list[index].search(right_dive_str)
    key_str = train_code_html_list[index].slice(left_name_index+left_name_string_len, right_index)
    
    left_code_index = train_code_html_list[index+1].search(left_code_string)
    right_index = train_code_html_list[index+1].search(right_dive_str)
    code_str = train_code_html_list[index+1].slice(left_code_index+left_code_string_len, right_index)
    if(!(key_str in table)){
      table[key_str] = code_str
      table[Tai2Tai(key_str)] = code_str
    }
  }
  return 0
}
    
function initial(table_name2code, car_class_dict){
  if(typeof table_name2code != "object"){
    log.TWR_ERR("Wrong table_name2code type.", "main.initial")
    return -1
  }
  else if(typeof car_class_dict != "object"){
    log.TWR_ERR("Wrong car_class_dict type.", "main.initial")
    return -1
  }
  if(isEmpty(table_name2code)){
    if(setup_station_code_dict(table_name2code) < 0){
      log.TWR_ERR("setup_station_code_dict() failed.", "main.initial")
      return -1
    }
  }
  if(isEmpty(car_class_dict)){
    car_class_dict["1100"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "自強號",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "DMU2800、2900、3000型柴聯及EMU型電車自強號"
                             }
    car_class_dict["1101"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "太魯閣",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "推拉式自強號"
                             }
    car_class_dict["1102"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "太魯閣",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express(Tarko)",
                              "KEY_CAR_CLASS_DESCRIPTION": "太魯閣"
                             }
    car_class_dict["1103"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "自強號",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "DMU3100型柴聯自強號"
                             }
    car_class_dict["1107"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "普悠瑪",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express(Puyuma)",
                              "KEY_CAR_CLASS_DESCRIPTION": "普悠瑪"
                             }
    car_class_dict["1108"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "自強號",
                              "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "推拉式自強號且無自行車車廂"
                             }
    car_class_dict["1110"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "莒光號",
                              "KEY_CAR_CLASS_NAME_EN": "Chu-Kuang Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "無身障座位"
                             }
    car_class_dict["1111"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "莒光號",
                              "KEY_CAR_CLASS_NAME_EN": "Chu-Kuang Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "有身障座位"
                             }
    car_class_dict["1114"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "莒光號",
                              "KEY_CAR_CLASS_NAME_EN": "Chu-Kuang Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "無身障座位,有自行車車廂"
                             }
    car_class_dict["1115"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "莒光號",
                              "KEY_CAR_CLASS_NAME_EN": "Chu-Kuang Express",
                              "KEY_CAR_CLASS_DESCRIPTION": "有身障座位,有自行車車廂"
                             }
    car_class_dict["1120"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "復興號",
                              "KEY_CAR_CLASS_NAME_EN": "Fu-Hsing Semi Express",
                              "KEY_CAR_CLASS_DESCRIPTION": ""
                             }
    car_class_dict["1131"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "區間車",
                              "KEY_CAR_CLASS_NAME_EN": "Local Train",
                              "KEY_CAR_CLASS_DESCRIPTION": ""
                             }
    car_class_dict["1132"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "區間快",
                              "KEY_CAR_CLASS_NAME_EN": "Fast Local Train",
                              "KEY_CAR_CLASS_DESCRIPTION": ""
                             }
    car_class_dict["1140"] = {"KEY_CAR_CLASS_NAME_ZH_TW": "普快車",
                              "KEY_CAR_CLASS_NAME_EN": "Ordinary train",
                              "KEY_CAR_CLASS_DESCRIPTION": ""
                             }
    
    // 加開班次
    var post_digit_list = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
    var len_post_digit_list = post_digit_list.length
    for(var index=0; index<len_post_digit_list; index++){
      var key = "110"+post_digit_list[index]
      if(!(key in car_class_dict)){
        car_class_dict["110"+post_digit_list[index]] = {"KEY_CAR_CLASS_NAME_ZH_TW": "自強號",
                                                        "KEY_CAR_CLASS_NAME_EN": "Tze-Chiang Limited Express",
                                                        "KEY_CAR_CLASS_DESCRIPTION": "加開班次"
                                                       }
      }
    }
  }
  return 0
}

function release(){
  log.TWR_INFO("Release.", "main.release")
}

function debug(){
  var num = 1
  var space = ' '
  var text = "桃園台北"
  while(text.search(space) >= 0){
    num++
    space += ' '
  }
  log.TWR_DEBUG(num-1)
}
