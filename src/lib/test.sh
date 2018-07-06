#!/bin/sh

libpsarc="node libpsarc.js "
pypsarc="python3 ../python/psarc-lib.py -f  "

dir="/Users/sandi/Library/Application Support/Steam/steamapps/common/Rocksmith2014/dlc/"
for i in `ls -p "$dir" | grep -v /`
do
    file="/Users/sandi/Library/Application Support/Steam/steamapps/common/Rocksmith2014/dlc/$i" 
    if [ -e "$file" ]
    then
        echo $i
        $libpsarc"$file"|sort > op1
        $pypsarc"$file"|sort > op2
        diff op1 op2
    fi
done