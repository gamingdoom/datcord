# What is Datcord?
  Datcord is an open-source discord client that respects your privacy. It is a very specialized fork of firefox. Datcord also handles emoji rendering better than     the normal discord client.

# Install
- # Linux
  - ## Appimage (easiest)
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

Edit makeflags in browser/config/mozconfig (default is -j12)

```
./mach bootstrap
./mach build
./mach run
```
