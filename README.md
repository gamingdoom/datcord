<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="changed/browser/branding/unofficial/default256.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Datcord</h3>

  <p align="center">
    An open-source Discord client
    <br/>
    <br/>
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/gamingdoom/datcord"> 
    <img alt="GitHub all releases" src="https://img.shields.io/github/downloads/gamingdoom/datcord/total"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/gamingdoom/datcord/Build-Linux-x86_64?label=Linux%20Build"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/gamingdoom/datcord/Build-Win64?label=Windows%20Build"> 
    <img alt="GitHub" src="https://img.shields.io/github/license/gamingdoom/datcord"> 
  </p>
</div>

# About Datcord
  Datcord is an open-source Discord client that respects your privacy. Datcord is a specialized version of Firefox (the official client is Chromium-based). Datcord handles emoji rendering better than the normal Discord client. Note that Discord can still track you even if you use Datcord. I chose Firefox for Datcord because Chromium-based browsers have a monopoly and if Firefox were to die out, only Chromium would be left.

# Install
- # Linux
  - ## Arch Linux
    - If you use Arch or an Arch-based distro, Datcord is available on the AUR:
	
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
  - Make sure that you have the latest version of Datcord.
  - Open about:addons page in Datcord
  
	- If you are using Datcord from tarball or AUR, run ``datcord "about:addons"`` on the command line.
	- If you are using the AppImage and you have integrated it, run ``~/Applications/Datcord-* "about:addons"`` in the terminal.
	
  - Click the "meatball menu" (3 horizontal dots) next to the on/off switch for Open With and select preferences.
  - Follow all setup instructions for Open With.
  - Press ctrl+w to close tabs until Datcord closes.
  #### Open With should now be setup and you can use it by right clicking on links.

# Building from source
```
git clone https://github.com/gamingdoom/datcord.git && cd datcord
./buildDatcord.sh
```
