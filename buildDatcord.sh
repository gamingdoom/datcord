#!/bin/bash

mkdir build
if [ -z "$(ls build)" ]; then
  git clone --recurse-submodules -b release https://github.com/mozilla/gecko-dev.git build
fi
cd build
#curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O
#python3 bootstrap.py --vcs=git
./mach bootstrap
./mach create-mach-environment
cp -r ../changed/* .
patch . ../mozilla_dirsFromLibreWolf.patch
./mach configure
./mach build
./mach package
