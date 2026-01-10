<br />
<div align="center">
  <a href="https://github.com/gamingdoom/datcord">
    <img src="resources/datcord.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Datcord</h3>

  <p align="center">
    An open-source Discord client
    <br/>
    <br/>
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/gamingdoom/datcord"> 
    <img alt="Total Downloads" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fsanghai.org%2Fdatcord-downloads%2F"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/gamingdoom/datcord/build.yml?branch=master"> 
    <img alt="GitHub" src="https://img.shields.io/github/license/gamingdoom/datcord"> 
  </p>
</div>

# About Datcord
  Datcord is an open-source Discord client that respects your privacy. Datcord is a specialized version of Firefox (the official client is Chromium-based). Datcord handles emoji rendering better than the normal Discord client. Note that Discord can still track you even if you use Datcord. I chose Firefox for Datcord because Chromium-based browsers have a monopoly and if Firefox were to die out, only Chromium would be left.

### Note: 
I don't use Discord/Datcord anymore because of their [terrible TOS](https://tosdr.org/en/service/536) which Datcord can't protect you from. I am also very busy personally and don't have too much time to work on Datcord.

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
  - ## Tarball
    - Grab the tarball from the releases then,
	    ```
	    tar -xvf datcord-linux-x86_64.tar
	    cd datcord
	    ./launch-app
	    ```
 - # Windows
   - The Windows installer is available from releases.

# Building from source
```
git clone https://github.com/gamingdoom/datcord.git --recurse-submodules -j8 && cd datcord
./build.sh
```
# Credits
- [@TheRedXD](https://github.com/TheRedXD), who designed Datcord's logo.
- Everyone who created issues.
