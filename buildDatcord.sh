#!/bin/bash

mozbuild=~/.mozbuild
export PATH="$PATH:$mozbuild/git-cinnabar"
datcordDir=$PWD

if [ ! -d $mozbuild ]; then
  mkdir $mozbuild
fi

if [ ! -d mozilla-unified ]; then
  mkdir mozilla-unified
  curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O
  python3 bootstrap.py --vcs=git --no-interactive --application-choice=browser_artifact_mode
fi

if [ ! -d $mozbuild/git-cinnabar ]; then
  git clone https://github.com/glandium/git-cinnabar.git $mozbuild/git-cinnabar
  cd $mozbuild/git-cinnabar
  make
  cd $datcordDir
fi	

cd mozilla-unified
cp -r ../src/changed/* .
cp ../src/mozconfig.linux mozconfig
patch -p1 < ../src/mozilla_dirsFromLibreWolf.patch

./mach configure
./mach build
./mach package

cd ..

mkdir datcord
tar --strip-components=1 -xvf  mozilla-unified/obj-x86_64-pc-linux-gnu/dist/*.tar.bz2 -C datcord/
#mv datcord/firefox datcord/datcord
#mv datcord/firefox-bin datcord/datcord-bin
cp -r distribution/ datcord/
mv datcord/distribution/policies-linux.json datcord/distribution/policies.json
cp open-in-default-browser/open-in-default-browser datcord/open-in-default-browser
cp src/launch-datcord datcord/launch-datcord
tar -cjf datcord.tar.bz2 datcord 