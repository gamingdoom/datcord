curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py --output bootstrap.py
python3 bootstrap.py --no-interactive
rm bootstrap.py
xcopy changed\*.* .\mozilla-unified /S /Y
cd mozilla-unified
./mach build
./mach package
