# Run with MozillaBuild
basedir=$(dirname "$0")
curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py --output bootstrap.py
python3 bootstrap.py --no-interactive
cp -r $basedir/changed/* mozilla-unified/
cd mozilla-unified
cat "ac_add_options --disable-default-browser-agent" >> mozconfig
cat "ac_add_options --enable-release" >> mozconfig
cat "ac_add_options --with-app-name=datcord" >> mozconfig
cat "ac_add_options --with-branding=browser/branding/unofficial" >> mozconfig
cat mozconfig
./mach build
./mach package
