# ftp-backblaze-proxy
FTP proxy to a backblaze bucket.

This currently only implements upload and directory listing because I don't need
anything beyond that. I needed this so my security cam can upload stills directly to Backblaze and the cam only supports ftp.

# Installation
clone the github repo to your machine
```
git clone https://github.com/virtualcodewarrior/ftp-backblaze-proxy.git
```

Do an npm install from the project root
```
cd ftp-backblaze-proxy
npm install
```
# configuration
Copy or rename config-example.json to config.json
```
cp config-example.json config.json
```
open the config file with your favorite  editor and fill in your Backblaze credentials for the bucket you want to use
- accountId: should be the **_applicationKeyId_** that you can find in the Account ID & Application Key dialog.
- applicationKey: should be the unique application key for this app, you should give it read and write access rights and preferably only allow access to the bucket you will be using
- bucketid: The Bucket ID as listed with your bucket

The ftp settings are self explanatory. I haven't tried ftps so you will have to try that yourself..

# Running
```
npm start
```
