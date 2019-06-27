var telegramUrl = "https://api.telegram.org/bot" + tg_token
var user_config_items_list = ["uid", "last_valid_input", "show_only_next_20_classes"]

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
