wget https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py
python3 bootstrap.py
rm bootstrap.py
cd mozilla-unified
copy /Y ../changed/* .
./mach build
./mach package
