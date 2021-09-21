# Install
  - ## Appimage (easiest)
    - Grab the AppImage from [releases](https://github.com/gamingdoom/datcord/releases/) and run it.
  - ## Tarball
    - Grab the tarball from the releases then,
    ```
    tar -xvf datcordLinux.tar
    cd datcord
    ./datcord
    ```

# Building from source

Edit makeflags in browser/config/mozconfig (default is -j12)

```
./mach bootstrap
./mach build
./mach run
```
