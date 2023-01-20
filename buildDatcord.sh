#!/bin/bash

mozbuild=~/.mozbuild
export PATH="$PATH:$mozbuild/git-cinnabar"
echo $PATH
mkdir mozilla-unified
if [ -z "$(ls mozilla-unified)" ]; then
  rm -r mozilla-unified
  curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O
  python3 bootstrap.py --vcs=git --no-interactive --application-choice=browser_artifact_mode
  $mozbuild/git-cinnabar/git-cinnabar install
fi
cd mozilla-unified
cp -r ../changed/* .
patch -p1 ../mozilla_dirsFromLibreWolf.patch
./mach configure
./mach build
./mach package
