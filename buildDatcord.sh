#!/bin/bash

mkdir build
if [ -z "$(ls build)" ]; then
  git clone --recurse-submodules -b release https://github.com/mozilla/gecko-dev.git build
fi
cd build
./mach create-mach-environment
cp -r ../changed/* .
patch . ../mozilla_dirsFromLibreWolf.patch
./mach build
./mach package
