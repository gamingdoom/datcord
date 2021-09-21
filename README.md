# Install
Grab the tarball from the releases then,
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
