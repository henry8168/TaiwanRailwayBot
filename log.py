from constants import *
import logging
import sys
import os
import datetime
import time

log_path = "twrailway.log"

DEBUG = 4
INFO  = 3
WARN  = 2
ERROR = 1

display_log_lv = DEBUG
save_log_lv = DEBUG
log_disabled = False


def log_check():
    if not os.path.exists(log_path):
        with open(log_path, 'w'):
            pass
    return 0

def TWR_ERR(msg, module=""):
    if log_disabled:
        return 0
    log_check()
    time_str = time.strftime("%Y-%m-%d %H:%M:%S")
    msg = "[TWR.erro] {} *** {} *** {}".format(module, msg, time_str)
    if ERROR <= save_log_lv:
        with open(log_path, "a") as myfile:
            myfile.write(msg+"\n")
    if ERROR <= display_log_lv:
        print(msg)
    return 0
    
def TWR_WARN(msg, module=""):
    if log_disabled:
        return 0
    log_check()
    time_str = time.strftime("%Y-%m-%d %H:%M:%S")
    msg = "[TWR.warn] {} * {} * {}".format(module, msg, time_str)
    if WARN <= save_log_lv:
        with open(log_path, "a") as myfile:
            myfile.write(msg+"\n")
    if WARN <= display_log_lv:
        print(msg)
    return 0
    
def TWR_INFO(msg, module=""):
    if log_disabled:
        return 0
    log_check()
    time_str = time.strftime("%Y-%m-%d %H:%M:%S")
    msg = "[TWR.info] {} {} {}".format(module, msg, time_str)
    if INFO <= save_log_lv:
        with open(log_path, "a") as myfile:
            myfile.write(msg+"\n")
    if INFO <= display_log_lv:
        print(msg)
    return 0
    
def TWR_DEBUG(msg, module=""):
    if log_disabled:
        return 0
    log_check()
    time_str = time.strftime("%Y-%m-%d %H:%M:%S")
    msg = "[TWR.debg] {} {} {}".format(module, msg, time_str)
    if DEBUG <= save_log_lv:
        with open(log_path, "a") as myfile:
            myfile.write(msg+"\n")
    if DEBUG <= display_log_lv and DEBUG_MODE:
        print(msg)
    return 0

if __name__ == "__main__":
    TWR_ERR("This is an error message", __name__+ sys._getframe().f_code.co_name)
    TWR_DEBUG("This is a debug message", __name__+ sys._getframe().f_code.co_name)
    TWR_INFO("This is an info message", __name__+ sys._getframe().f_code.co_name)
    TWR_WARN("This is a warning message", __name__+ sys._getframe().f_code.co_name)
