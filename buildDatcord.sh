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
#patch -p1 ../mozilla_dirsFromLibreWolf.patch
./mach configure
./mach build
./mach package
