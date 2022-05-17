#!/bin/bash

mkdir build
if [ -z "$(ls build)" ]; then
  git clone --recurse-submodules -b release https://github.com/mozilla/gecko-dev.git build
  build/mach create-mach-environment
else 
  rm -rf build
  git clone --recurse-submodules -b release https://github.com/mozilla/gecko-dev.git build
  build/mach create-mach-environment
fi
cd build
mkdir .mozbuild
export MOZBUILD_STATE_PATH=".mozbuild"
cp -r ../changed/* .
patch . ../mozilla_dirsFromLibreWolf.patch
./mach build
./mach package
