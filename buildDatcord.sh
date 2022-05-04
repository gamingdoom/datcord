#!/bin/bash

mkdir build
if [ -z "$(ls build)" ]; then
  git clone --recurse-submodules https://github.com/mozilla/gecko-dev.git build
  build/mach create-mach-environment
fi
cd build
cp ../changed/* .
patch . ../mozilla_dirsFromLibreWolf.patch
./mach build
./mach package
