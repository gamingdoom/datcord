#!/bin/sh

rm datcord-linux-x86_64.tar.bz2
wget https://github.com/gamingdoom/datcord/releases/latest/download/datcord-linux-x86_64.tar.bz2
mkdir datcord-bin
tar -xvf datcord-linux-x86_64.tar.bz2 -C datcord-bin/
chmod +x datcord-bin/launch-datcord
chmod +x datcord-bin/open-in-default-browser
sudo mkdir /usr/lib/datcord
sudo cp -r datcord-bin/* /usr/lib/datcord
chmod +x /usr/bin/launch-datcord
sudo ln -s /usr/lib/datcord/launch-datcord /usr/bin/datcord
