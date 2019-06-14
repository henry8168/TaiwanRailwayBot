#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Simple Bot to reply to Telegram messages.
This is built on the API wrapper, see echobot2.py to see the same example built
on the telegram.ext bot framework.
This program is dedicated to the public domain under the CC0 license.
"""
import log
import os
import telegram
from telegram.error import NetworkError, Unauthorized
import urllib.request
import requests
import time
from time import sleep
import datetime
import json
from constants import *

def main():
    """Run the bot."""
    update_id = None
    station_name2code = {}
    car_class_dict = {}
    
    # Telegram Bot Authorization Token
    bot = telegram.Bot('xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') # BotToken
    # notifier = telegram.Bot('xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') # Optional: Another bot to notify when crashing.

    # get the first pending update_id, this is so we can skip over it in case
    # we get an "Unauthorized" exception.

    update_result = bot.get_updates()
    if not len(update_result):
        update_id = None
    else:
        update_id = update_result[0].update_id
        #update_id = bot.get_updates()[0].update_id
    
    schedule_json_list, today_date = get_json_list()
    if initial(station_name2code, car_class_dict) < 0:
        log.TWR_ERR("initial() failed.", "main.main")
        release()
        return -1
        
    log.TWR_INFO("Start get_updates...")
    
    while True:
        try:
            time_int = int(time.strftime("%M"))
            new_today_date = datetime.datetime.now().strftime("%Y%m%d")
            if new_today_date != today_date:
                log.TWR_INFO("Start to re-initial.", "main.main")
                schedule_json_list, today_date = get_json_list()
                if initial(station_name2code, car_class_dict) < 0:
                    log.TWR_ERR("re-initial() failed.", "main.main")
                    release()
                    return -1
            # Request updates after the last update_id
            for update in bot.get_updates(offset=update_id, timeout=10):
                update_id = update.update_id + 1
                if echo(update, today_date, station_name2code, schedule_json_list, car_class_dict) < 0:
                    log.TWR_ERR("echo() failed.", "main.main")
                    release()
                    return -1
        except NetworkError:
            log.TWR_ERR("Network error.", "main.main")
            sleep(1)
        except Unauthorized:
            # The user has removed or blocked the bot.
            log.TWR_INFO("The user has removed or blocked the bot.", "main.main")
            update_id += 1
        except KeyboardInterrupt:
            print("")
            log.TWR_INFO("Keyboard Exit.")
            break
        except:
            shutdown_notification(notifier)
            break
    release()
    return 0

def shutdown_notification(bot):
    if not USE_NOTIFY_BOT:
        return 0
    msg = "{} was shut down.".format(PROGRAM_NAME)
    log.TWR_INFO(msg, "main.main")
    bot.send_message(chat_id=Author_UID, 
                     text=msg)
    return 0
def echo(update, date_str, table_name2code, json_list_t, table_car_class_dict):
    """Echo the message the user sent."""
    ret = 0
    if type(table_name2code) != type({}):
        log.TWR_ERR("Wrong table_name2code type.", "main.echo")
        ret = -1
    elif type(json_list_t) != type([]):
        log.TWR_ERR("Wrong json_list_t type.", "main.echo")
        ret = -1
    elif update.message:  # your bot can receive updates without messages
        received_uid = update.message.chat.id
        received_username = update.message.chat.username
        received_firstname = update.message.chat.first_name
        log_msg_postfix = ", UID: {}, username: {}, First name: {}".format(received_uid, received_username, received_firstname)
        received_msg = update.message.text
        if received_msg is None:
            return 0
        if received_msg == "/help" or received_msg == "/start":
            log.TWR_INFO(received_msg + log_msg_postfix, "main.echo")
            update.message.reply_text(help_msg)
            ret = 0
        else:
            # Reply to the message
            input_stations = received_msg.split(' ')
            len_input_stations = len(input_stations)
            if len_input_stations > 2 or len_input_stations < 2:
                msg = "車站數不正確，請輸入兩個車站名。訊息: {}".format(received_msg)
                update.message.reply_text(msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
            elif input_stations[0] not in table_name2code or input_stations[1] not in table_name2code:
                msg = "查無車站名稱，請輸入兩站正確的車站。訊息: {}".format(received_msg)
                update.message.reply_text(msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
            elif table_name2code[input_stations[0]] == table_name2code[input_stations[1]]:
                msg = "相同的車站，請輸入兩個不同車站。訊息: {}".format(received_msg)
                update.message.reply_text(msg)
                log_msg = msg + log_msg_postfix
                log.TWR_ERR(log_msg, "main.echo")
                ret = 0
            else:
                msg = "收到訊息: {}".format(received_msg)
                log_msg = msg + log_msg_postfix
                log.TWR_INFO(log_msg, "main.echo")
                
                len_json_list_t = len(json_list_t)
                src_station_name = input_stations[0]
                dst_station_name = input_stations[1]
                src_station_code = table_name2code[src_station_name]
                dst_station_code = table_name2code[dst_station_name]
                reply_train_msg_list = []
                reply_train_msg_str = ""
                for train_info in json_list_t:
                    reply_train_single_str = ""
                    src_station_time_info = None
                    dst_station_time_info = None
                    for time_info in train_info["TimeInfos"]:
                        reply_train_single_line_str = ""
                        if src_station_time_info is None and time_info["Station"] == src_station_code:
                            src_station_time_info = time_info
                        elif src_station_time_info and dst_station_time_info is None and time_info["Station"] == dst_station_code:
                            dst_station_time_info = time_info
                            break
                    if src_station_time_info and dst_station_time_info:
                        reply_train_single_str += "{}  {}  ".format(src_station_time_info["DEPTime"][:-3], dst_station_time_info["DEPTime"][:-3])
                        car_class_result = (table_car_class_dict.get(train_info.get("CarClass")))
                        if car_class_result is None:
                            # log.TWR_ERR("Unknown car class code: {}".format(train_info.get("CarClass")), "main.echo")
                            car_class_code_str = train_info.get("CarClass")
                            reply_train_single_str += car_class_code_str
                            # print(train_info.get("CarClass"))
                        else:
                            car_class_name_str = car_class_result.get(KEY_CAR_CLASS_NAME_ZH_TW)
                            reply_train_single_str += car_class_name_str
                            # print( car_class_result.get(KEY_CAR_CLASS_NAME_ZH_TW) )
                        reply_train_msg_list.append(reply_train_single_str)
                
                sorted_reply_train_msg_list = reply_train_msg_list_to_dict(reply_train_msg_list)
                if not sorted_reply_train_msg_list:
                    msg = "查無班次"
                    log.TWR_INFO(msg)
                    update.message.reply_text(msg)
                    ret = 0
                else:
                    head_str = "{}/{}/{}\n{} -> {}\n".format(date_str[0:4], date_str[4:6], date_str[6:], src_station_name, dst_station_name)
                    log.TWR_INFO("Reply the train info: ")
                    len_reply_train_msg_list = len(sorted_reply_train_msg_list)
                    for index in range(len_reply_train_msg_list):
                        if index and index%20 == 0:
                            reply_train_msg_str = reply_train_msg_str[:-1]
                            log.TWR_INFO("\n{}".format(head_str+reply_train_msg_str))
                            update.message.reply_text(head_str+reply_train_msg_str)
                            reply_train_msg_str = ""
                        reply_train_msg_str += (sorted_reply_train_msg_list[index]+"\n")
                    if reply_train_msg_str:
                        reply_train_msg_str = head_str+reply_train_msg_str[:-1]
                        log.TWR_INFO("\n{}".format(reply_train_msg_str))
                        update.message.reply_text(reply_train_msg_str)
                    ret = 0
    return ret
    
def reply_train_msg_list_to_dict(msg_list):
    msg_dict = {}
    ordered_msg_list = []
    for line in msg_list:
        key = -1
        line_list = line.split(' ')
        len_line_list = len(line_list)
        for item in line_list:
            if item.find(':') >= 0:
                key = int(item.replace(':', ''))
                msg_dict[key] = line
                break
    time_int = int(time.strftime("%H%M"))
    for i in range(0, 2400, 100):
        for j in range(60):
            key = i+j
            if (key in msg_dict) and key >= time_int:
                ordered_msg_list.append(msg_dict[key])
    return ordered_msg_list

def download_json(file_name_t):
    save_file_path = "schedule_json/{}".format(file_name_t)
    if not os.path.exists(save_file_path):
        log.TWR_INFO("Download the file {}...".format(file_name_t))
        
        file_url = get_json_file_url(file_name_t)
        
        urllib.request.urlretrieve(file_url, save_file_path) 
        log.TWR_INFO("Done.")
    else:
        log.TWR_INFO("File {} exists.".format(save_file_path))
        
    return 0

def get_json_file_url(file_name):
    taiwan_railway_administration_url = "https://ods.railway.gov.tw"
    json_list_url = taiwan_railway_administration_url + "/tra-ods-web/ods/download/dataResource/railway_schedule/JSON/list"
    html = (requests.get(json_list_url)).text
    html_list = html.split('\n')
    target_line = ""
    for line in html_list:
        if line.find(file_name) >= 0:
            target_line = line
            break
    if not target_line:
        log.TWR_ERR("No such file name.")
        return ""
    left_quotation_mark_index = target_line.find('\"')
    right_quotation_mark_index = (target_line[left_quotation_mark_index+1:]).find('\"')
    right_quotation_mark_index += left_quotation_mark_index+1
    return taiwan_railway_administration_url + target_line[left_quotation_mark_index+1:right_quotation_mark_index]

def Tai2Tai(str_t):
    if str_t.find("臺") >= 0:
        return str_t.replace("臺", "台")
    if str_t.find("台") >= 0:
        return str_t.replace("台", "臺")

def setup_station_code_dict(table):
    if type(table) != type({}):
        log.TWE_RR("Wrong input type.", "main.setup_station_code_dict")
        return -1
    
    stations_code_url = "https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip111/view"
    html = (requests.get(stations_code_url)).text
    html_list = html.split('\n')
    train_code_html_list = []
    for line in html_list:
        if line.find("traincode_name") >= 0 or line.find("traincode_code") >= 0:
            train_code_html_list.append(line)
    train_code_html_list_len = len(train_code_html_list)
    
    right_dive_str = "</div>"
    left_name_string = "<div class=\"traincode_name1\">"
    left_name_string_len = len(left_name_string)
    left_code_string = "<div class=\"traincode_code1\">"
    left_code_string_len = len(left_code_string)
    for index in range(0, train_code_html_list_len, 2):    
        left_name_index = train_code_html_list[index].find(left_name_string)
        right_index = train_code_html_list[index].find(right_dive_str)
        key_str = train_code_html_list[index][left_name_index+left_name_string_len : right_index]
        
        left_code_index = train_code_html_list[index+1].find(left_code_string)
        right_index = train_code_html_list[index+1].find(right_dive_str)
        code_str = train_code_html_list[index+1][left_code_index+left_code_string_len : right_index]
        if key_str not in table:
            table[key_str] = code_str
            table[Tai2Tai(key_str)] = code_str
        
    return 0

def get_json_list():
    today_file_date = datetime.datetime.now().strftime("%Y%m%d")
    today_file_name = today_file_date +".json"
    tomorrow_file_name = (datetime.date.today()+datetime.timedelta(days=1)).strftime("%Y%m%d")+".json"
    yesturday_file_name = (datetime.date.today()+datetime.timedelta(days=-1)).strftime("%Y%m%d")+".json"
    download_json(today_file_name)
    download_json(tomorrow_file_name)
    today_file_name_path = "schedule_json/{}".format(today_file_name)
    if not os.path.exists(today_file_name_path):
        log.TWR_ERR("The file [{}] doesn't exitst.".format(today_file_name_path), "main.initial")
        return -1
    with open(today_file_name_path, "r") as file:
        json_list_t = (json.load(file))["TrainInfos"]
    yesturday_file_path = "schedule_json/{}".format(yesturday_file_name)
    if os.path.exists(yesturday_file_path):
        os.remove(yesturday_file_path)
    return json_list_t, today_file_date

def initial(table_name2code, car_class_dict):
    if type(table_name2code) != type({}):
        log.TWR_ERR("Wrong table_name2code type.", "main.initial")
        return -1
    elif type(car_class_dict) != type({}):
        log.TWR_ERR("Wrong car_class_dict type.", "main.initial")
        return -1
    
    if setup_station_code_dict(table_name2code) < 0:
        log.TWR_ERR("setup_station_code_dict() failed.", "main.initial")
        return -1
        
    car_class_dict["1100"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "自強號",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express",
                                KEY_CAR_CLASS_DESCRIPTION: "DMU2800、2900、3000型柴聯及EMU型電車自強號"
                            }
    car_class_dict["1101"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "自強號",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express",
                                KEY_CAR_CLASS_DESCRIPTION: "推拉式自強號"
                            }
    car_class_dict["1102"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "太魯閣",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express(Tarko)",
                                KEY_CAR_CLASS_DESCRIPTION: "太魯閣"
                            }
    car_class_dict["1103"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "自強號",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express",
                                KEY_CAR_CLASS_DESCRIPTION: "DMU3100型柴聯自強號"
                            }
    car_class_dict["1107"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "普悠瑪",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express(Puyuma)",
                                KEY_CAR_CLASS_DESCRIPTION: "普悠瑪"
                            }
    car_class_dict["1108"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "自強號",
                                KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express",
                                KEY_CAR_CLASS_DESCRIPTION: "推拉式自強號且無自行車車廂"
                            }
    car_class_dict["1110"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "莒光號",
                                KEY_CAR_CLASS_NAME_EN: "Chu-Kuang Express",
                                KEY_CAR_CLASS_DESCRIPTION: "無身障座位"
                            }
    car_class_dict["1111"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "莒光號",
                                KEY_CAR_CLASS_NAME_EN: "Chu-Kuang Express",
                                KEY_CAR_CLASS_DESCRIPTION: "有身障座位"
                            }
    car_class_dict["1114"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "莒光號",
                                KEY_CAR_CLASS_NAME_EN: "Chu-Kuang Express",
                                KEY_CAR_CLASS_DESCRIPTION: "無身障座位,有自行車車廂"
                            }
    car_class_dict["1115"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "莒光號",
                                KEY_CAR_CLASS_NAME_EN: "Chu-Kuang Express",
                                KEY_CAR_CLASS_DESCRIPTION: "有身障座位,有自行車車廂"
                            }
    car_class_dict["1120"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "復興號",
                                KEY_CAR_CLASS_NAME_EN: "Fu-Hsing Semi Express",
                                KEY_CAR_CLASS_DESCRIPTION: ""
                            }
    car_class_dict["1131"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "區間車",
                                KEY_CAR_CLASS_NAME_EN: "Local Train",
                                KEY_CAR_CLASS_DESCRIPTION: ""
                            }
    car_class_dict["1132"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "區間快",
                                KEY_CAR_CLASS_NAME_EN: "Fast Local Train",
                                KEY_CAR_CLASS_DESCRIPTION: ""
                            }
    car_class_dict["1140"] = {  KEY_CAR_CLASS_NAME_ZH_TW: "普快車",
                                KEY_CAR_CLASS_NAME_EN: "Ordinary train",
                                KEY_CAR_CLASS_DESCRIPTION: ""
                            }
    
    # 加開班次
    post_digit_list = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
    for digit in post_digit_list:
        key = "110"+digit
        if key not in car_class_dict:
            car_class_dict["110"+digit] = { KEY_CAR_CLASS_NAME_ZH_TW: "自強號",
                                            KEY_CAR_CLASS_NAME_EN: "Tze-Chiang Limited Express",
                                            KEY_CAR_CLASS_DESCRIPTION: "加開班次"
                                            }
        
    return 0

def release():
    log.TWR_INFO("Release.", "main.release")

if __name__ == '__main__':
    main()
