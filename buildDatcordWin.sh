# Run with MozillaBuild
basedir=$(dirname "$0")
curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py --output bootstrap.py
python3 bootstrap.py --no-interactive
cp -rf $basedir/changed/* mozilla-unified/
# It is using nightly branding no matter what so we replace the nightly stuff with our stuff
cp -rf mozilla-unified/browser/branding/unofficial/* mozilla-unified/browser/branding/nightly/*
cd mozilla-unified
cat "ac_add_options --disable-default-browser-agent" >> mozconfig
cat "ac_add_options --enable-release" >> mozconfig
cat "ac_add_options --with-app-name=datcord" >> mozconfig
cat "ac_add_options --with-branding=browser/branding/unofficial" >> mozconfig
cat mozconfig
./mach build
./mach package
