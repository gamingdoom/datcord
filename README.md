# What is Datcord?
  Datcord is an open-source discord client that respects your privacy. It is a very specialized fork of firefox. Datcord also handles emoji rendering better than     the normal discord client.

# Install
- # Linux
  - ## Arch Linux
    - If you use Arch or an Arch-based distro, datcord is available on the AUR:
	
      ``aura -A datcord-bin``
  - ## Appimage
    - Grab the AppImage from [releases](https://github.com/gamingdoom/datcord/releases/) and run it. If you choose to integrate it, run
    
       ``~/Applications/Datcord-* --appimage-portable-home``
  - ## Installer Script
    ``curl https://raw.githubusercontent.com/gamingdoom/datcord/master/installDatcord.sh | bash``
  - ## Tarball
    - Grab the tarball from the releases then,
	    ```
	    tar -xvf datcordLinux.tar
	    cd datcord
	    ./datcord
	    ```
 - # Windows
   - A windows build is available from GitHub Actions but is not finished yet.
   
  ## Open With Setup
  #### [Open With](https://github.com/darktrojan/openwith) allows you to open links from Datcord in other browsers. To set it up, follow these instructions:
  - Run ``datcord "about:addons"`` on the command line.
  - Click the "meatball menu" (3 horizontal dots) next to the on/off switch for Open With and select preferences.
  - Follow all setup instructions for Open With.
  - Press ctrl+w to close tabs until Datcord closes.
  #### Open With should now be setup and you can use it by right clicking on links.

# Building from source
```
git clone https://github.com/gamingdoom/datcord.git && cd datcord
./buildDatcord.sh
```
