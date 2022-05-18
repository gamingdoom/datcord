#!/bin/bash

#mkdir build
#if [ -z "$(ls build)" ]; then
# git clone --recurse-submodules -b release https://github.com/mozilla/gecko-dev.git build
#fi
#cd build
curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O
python3 bootstrap.py --vcs=git
cd mozilla-unified
mozbuild=~/.mozbuild
export PATH="$PATH:$mozbuild/git-cinnabar"
./mach bootstrap
cp -r ../changed/* .
patch -p1 ../mozilla_dirsFromLibreWolf.patch
./mach configure
./mach build
./mach package
