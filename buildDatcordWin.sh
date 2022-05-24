#!/bin/sh
# Script to build Datcord on Windows. Call with MozillaBuild.
curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py --output bootstrap.py
python3 bootstrap.py --no-interactive
rm bootstrap.py
cp -r changed/* mozilla-unified
cd mozilla-unified
./mach build
./mach package
