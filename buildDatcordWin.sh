# Run with MozillaBuild
basedir=$(dirname "$0")
if [ ! -d mozilla-unified ]
then
  curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py --output bootstrap.py
  python3 bootstrap.py --no-interactive
fi
cp -rf $basedir/src/changed/* mozilla-unified/
# It is using nightly branding no matter what so we replace the nightly stuff with our stuff
cp -rf mozilla-unified/browser/branding/unofficial/* mozilla-unified/browser/branding/nightly/*
cd mozilla-unified
echo "ac_add_options --disable-default-browser-agent" > mozconfig
echo "ac_add_options --enable-release" >> mozconfig
echo "ac_add_options --with-app-name=firefox" >> mozconfig
echo "ac_add_options --with-branding=browser/branding/datcord" >> mozconfig
cat mozconfig
patch -p1 < $basedir/mozilla_dirsFromLibreWolf.patch
./mach build
./mach package

# Change the setup exe
mkdir $basedir/work
cp obj-x86_64-pc-mingw32/dist/install/sea/*.exe $basedir/work/ffSetup-win64.exe
cd $basedir/work
7z x ffSetup-win64.exe
ls
mv core datcord
rm setup.exe
cd datcord
mv firefox.exe datcord.exe
cd ..
cp ../windows/datcord.ico datcord/
cp -r ../distribution datcord/
# Based on librewolf mk.py
mkdir x86-ansi
wget -q -O ./x86-ansi/nsProcess.dll https://shorsh.de/upload/we7v/nsProcess.dll
wget -q -O ./vc_redist.x64.exe https://aka.ms/vs/17/release/vc_redist.x64.exe
cp ../windows/setup.nsi .
cp ../windows/datcord.ico .
cp ../windows/banner.bmp .
makensis.exe -V1 setup.nsi
# Setup filename will be datcordSetup-win64.exe
