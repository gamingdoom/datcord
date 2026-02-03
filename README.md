<br />
<div align="center">
  <a href="https://github.com/gamingdoom/datcord">
    <img src="resources/datcord.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Datcord</h3>

  <p align="center">
    An Open-Source Discord Client
    <br/>
    <br/>
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/gamingdoom/datcord"> 
    <img alt="Total Downloads" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fsanghai.org%2Fdatcord-downloads%2F"> 
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/gamingdoom/datcord/build.yml?branch=master"> 
    <img alt="GitHub" src="https://img.shields.io/github/license/gamingdoom/datcord"> 
  </p>
</div>

# About Datcord
  Datcord is an Open-Source Discord client that respects your privacy. Datcord is based on [Neutron](https://github.com/gamingdoom/neutron), which means that it uses Firefox/Gecko under the hood instead of Chromium. Datcord is also the primary sample application of Neutron, which combats the monopoly of Chromium-based browsers through the use of Firefox/Gecko to create a Progressive Web Applications (PWAs).

# Install
- # Linux
  - ## Flatpak
    ``flatpak install io.github.gamingdoom.Datcord``
  - ## Arch Linux
    - If you use Arch or an Arch-based distro, Datcord is available on the AUR:
	
      ``aura -A datcord-bin``
  - ## Debian, Ubuntu, Mint, etc.
    - Datcord is available as a `.deb` file from [releases](https://github.com/gamingdoom/datcord/releases/).
  - ## Appimage
    - Grab the AppImage from [releases](https://github.com/gamingdoom/datcord/releases/) and run it. If you choose to integrate it, run
    
       ``~/Applications/Datcord-* --appimage-portable-home``
  - ## Tarball
    - Grab the appropriate tarball from the [releases](https://github.com/gamingdoom/datcord/releases/). Then:
	    ```bash
	    tar -xvf datcord-linux-x86_64.tar
	    cd datcord
	    ./launch-app
	    ```
- # Windows
  - Installers for Windows are available from [releases](https://github.com/gamingdoom/datcord/releases/).
- # MacOS
  - Highly experimental MacOS versions of Datcord are available from [releases](https://github.com/gamingdoom/datcord/releases/).
  - I don't have any way to test these builds, so they might not work.

# Building from source
```
git clone https://github.com/gamingdoom/datcord.git --recurse-submodules -j8 && cd datcord
./build.sh
```
# Credits
- [@TheRedXD](https://github.com/TheRedXD), who designed Datcord's logo.
- Everyone who created issues.
