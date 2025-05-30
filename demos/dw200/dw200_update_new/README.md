# Overview
This is a demo for upgrading the current application by scanning a QR code. The steps are as follows:

1. Build the new code into a app package file. Click the 'package' button in VSCode,a dpk file will generated in .temp folder
2. Upload the compressed package at a web server and obtain an download url.
3. Convert the download url and MD5 into a QR code.
5. The device scans the QR code to obtain the download url and MD5, then calls the dxOta.update() function,the function will :
    - to download the compressed package and verify its completeness using the MD5 hash.
    - After reboot, os will unzip the package and overwrite the existing code.

# Files:

1. update.dpk is update package file,the md5 value is 'd825ba4c589496e60123d5ae48087c36',the download url = http://101.200.139.97:12346/download/update.dpk
2. updateqrcode.png is the qrcode,the content = {"url":"http://101.200.139.97:12346/download/update.dpk","md5":"d825ba4c589496e60123d5ae48087c36"}
3. beforeupdate/afterupdate.png is the running result compare
