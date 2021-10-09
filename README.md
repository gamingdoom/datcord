# What is Datcord?
  Datcord is an open-source discord client that respects your privacy. It is a very specialized fork of firefox. Datcord also handles emoji rendering better than     the normal discord client.

# Install
- # Linux
  - ## Appimage (easiest) (broken)
    - Grab the AppImage from [releases](https://github.com/gamingdoom/datcord/releases/) and run it.
  - ## Tarball
    - Grab the tarball from the releases then,
    ```
    tar -xvf datcordLinux.tar
    cd datcord
    ./datcord
    ```
 - # Windows
   - Coming soon
 - # Mac
   - I don't have a mac so probably not coming (unless someone builds and tests it and then pull requests)

# Building from source

Dependences (debian):
```
sudo apt-get install python3 python3-distutils python3-pip build-essential libpython3-dev m4 nodejs unzip uuid zip libasound2-dev libcurl4-openssl-dev libdbus-1-dev libdbus-glib-1-dev libdrm-dev libgtk-3-dev libpulse-dev libx11-xcb-dev libxt-dev xvfb nasm rustc clang
pip3 install --upgrade setuptools
pip3 install wheel setuptools zstandard==0.15.2 cffi>=1.13.0 glean-parser==2.5.0 appdirs>=1.4 Click>=7 diskcache>=4 importlib-metadata iso8601>=0.1.10 Jinja2>=2.10.1 jsonschema>=3.0.2 attrs>=17.4.0 MarkupSafe>=2.0 pycparser pyrsistent>=0.14.0 PyYAML>=3.13 six>=1.11.0 typing-extensions>=3.6.4  yamllint>=1.18.0  pathspec>=0.5.3 zipp>=0.5 psutil==5.8.0 
cargo install cbindgen
```
```
git clone https://github.com/gamingdoom/datcord.git && cd datcord
./mach create-mach-environment
./mach build
./mach run
```
