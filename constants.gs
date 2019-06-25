var DEBUG_MODE = 1
var VERSION = "1.0.5"
var USE_NOTIFY_BOT = true

var Author_UID = YourUID
var tg_token = 'YourBotToken'
var telegramUrl = "https://api.telegram.org/bot" + tg_token
var my_folder_id = 'YourGoogleDriveFolderIdToSaveScheduleJson'
var my_folder_name = 'schedule_json'

var user_info_spreadsheets_id = "YourGoogleDriveSpreadSheetsIdToRecordUser"
var user_using_record_sheet_name = "user using record"

var PROGRAM_NAME = "Taiwan Railway bot"

var MAX_TRY = 5
var KEY_CAR_CLASS_NAME_ZH_TW = "CAR_CLASS_NAME_ZH_TW"
var KEY_CAR_CLASS_NAME_EN = "CAR_CLASS_NAME_EN"
var KEY_CAR_CLASS_DESCRIPTION = "CAR_CLASS_DESCRIPTION"

var KEY_STATISTIC_UID = "UID"
var KEY_STATISTIC_USERNAME = "USERNAME"
var KEY_STATISTIC_FIRST_NAME = "FIRST_NAME"

var VAL_CAR_CLASS_STR_SPACE = 8

var help_msg = "[台鐵時刻查詢] ver "+VERSION+" \n\
請輸入兩車站名，將告知火車班次。\n\
ex: 桃園 台北\n\
\n\
資料來源: https://data.gov.tw/dataset/6138\n\
開發者: @HenryLab\n"

