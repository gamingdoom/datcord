<br />
<div align="center">
  <a href="https://github.com/gamingdoom/datcord">
    <img src="src/changed/browser/branding/datcord/default256.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Datcord</h3>

  <p align="center">
    An open-source Discord client
    <br/>
    <br/>
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/gamingdoom/datcord"> 
    <img alt="GitHub all releases" src="https://img.shields.io/github/downloads/gamingdoom/datcord/total"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/gamingdoom/datcord/build-linux-x86_64.yml?branch=master&label=Linux%20%20Build"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/gamingdoom/datcord/build-win64.yml?branch=master&label=Windows%20%20Build"> 
    <img alt="GitHub" src="https://img.shields.io/github/license/gamingdoom/datcord"> 
  </p>
</div>

# About Datcord
  Datcord is an open-source Discord client that respects your privacy. Datcord is a specialized version of Firefox (the official client is Chromium-based). Datcord handles emoji rendering better than the normal Discord client. Note that Discord can still track you even if you use Datcord. I chose Firefox for Datcord because Chromium-based browsers have a monopoly and if Firefox were to die out, only Chromium would be left.

### Note: 
I don't use discord/datcord anymore because of their [terrible TOS](https://tosdr.org/en/service/536). I am busy and I am not able to maintain Datcord as much anymore. I might release occasional updates but there are no guarantees. 

# Install
- # Linux
  - ## Flatpak
    ``flatpak install io.github.gamingdoom.Datcord``
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
   - The Windows installer is available from releases.

# Building from source
```
git clone https://github.com/gamingdoom/datcord.git --recurse-submodules && cd datcord
./buildDatcord.sh
```
