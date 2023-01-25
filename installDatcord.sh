#!/bin/sh

rm datcord-linux-x86_64.tar.bz2
wget https://github.com/gamingdoom/datcord/releases/latest/download/datcord-linux-x86_64.tar.bz2
mkdir datcord-bin
tar -xvf datcord-linux-x86_64.tar.bz2 -C datcord-bin/
sudo mkdir /usr/bin/datcord.d
sudo cp -r datcord-bin/* /usr/bin/datcord.d
sudo ln -s /usr/bin/datcord.d/datcord /usr/bin/datcord
sudo cp datcord-bin/open-in-default-browser/open-in-default-browser /usr/bin/open-in-default-browser && chmod +x /usr/bin/open-in-default-browser
