#!/bin/bash

export mozbuild=~/.mozbuild
export PATH="$PATH:$mozbuild/git-cinnabar"
datcordDir=$PWD

mkdir -p $mozbuild

if [ ! -d mozilla-unified ]; then
  mkdir mozilla-unified
  curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O
  python3 bootstrap.py --vcs=git --no-interactive --application-choice=browser_artifact_mode
fi

if [ ! -d $mozbuild/git-cinnabar ]; then
  git clone https://github.com/glandium/git-cinnabar.git $mozbuild/git-cinnabar
  cd $mozbuild/git-cinnabar
  make
  cd $datcordDir
fi	

cd mozilla-unified
cp -r ../src/changed/* .
cp ../src/mozconfig.windows mozconfig
patch -p1 < ../src/mozilla_dirsFromLibreWolf.patch

# Add cross compile target
rustup target add x86_64-pc-windows-msvc

# Install toolchains
if [ $# -eq 0 ]; then
	cd $mozbuild
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-binutils 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-cbindgen 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-clang 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-dump_syms 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-liblowercase 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-nasm 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-node 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-rust-cross 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-winchecksec 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-wine 
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build nsis
	$datcordDir/mozilla-unified/mach artifact toolchain --from-build sysroot-x86_64-linux-gnu
	cd $datcordDir/mozilla-unified
else
	if  [ "$1" -ne "--no-download-toolchains" ]; then
		cd $mozbuild
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-binutils 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-cbindgen 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-clang 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-dump_syms 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-liblowercase 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-nasm 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-node 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-rust-cross 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-winchecksec 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build linux64-wine 
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build nsis
		$datcordDir/mozilla-unified/mach artifact toolchain --from-build sysroot-x86_64-linux-gnu
		cd $datcordDir/mozilla-unified
	fi
fi


# Get windows sdk if needed
if [ ! -d $mozbuild/win-cross ]; then
	# Generate yaml that contains things to download from Visual Studio packages
	./mach python --virtualenv build build/vs/generate_yaml.py \
		--major \
		17 \
		Microsoft.VisualCpp.CRT.Headers \
		Microsoft.VisualCpp.CRT.Redist.ARM64 \
		Microsoft.VisualCpp.CRT.Redist.X64 \
		Microsoft.VisualCpp.CRT.Redist.X86 \
		Microsoft.VisualCpp.CRT.x64.Desktop \
		Microsoft.VisualCpp.CRT.x64.Store \
		Microsoft.VisualCpp.CRT.x86.Desktop \
		Microsoft.VisualCpp.CRT.x86.Store \
		Microsoft.VisualCpp.DIA.SDK \
		Microsoft.VisualCpp.Tools.HostX64.TargetARM64 \
		Microsoft.VisualCpp.Tools.HostX64.TargetX64 \
		Microsoft.VisualCpp.Tools.HostX64.TargetX86 \
		Microsoft.VisualStudio.Component.VC.ATL.ARM64 \
		Microsoft.VisualStudio.Component.VC.ATL \
		Microsoft.VisualStudio.Component.VC.ATLMFC \
		Microsoft.VisualStudio.Component.VC.MFC.ARM64 \
		Win10SDK_10.0.19041 \
		-o \
		build/vs/vs2022.yaml

	./mach --no-interactive python --virtualenv build build/vs/pack_vs.py build/vs/vs2022.yaml -o $mozbuild/vs.tar.zst
	mkdir -p $mozbuild/win-cross && cd $mozbuild/win-cross && rm -rf vs && tar xf ../vs.tar.zst
	cd $datcordDir/mozilla-unified
fi

cp $mozbuild/win-cross/vs/Windows Kits/10/bin/10.0.19041.0/x64/fxc.exe $mozbuild/win-cross/vs/Windows Kits/10/bin/10.0.19041.0/x64/fxc2.exe

ls $mozbuild
ls $mozbuild/wine/bin

patch -p1 < ../windows/fxc.patch

./mach configure
./mach build
./mach package

# Change the setup exe
mkdir $datcordDir/work
cp obj-x86_64-pc-mingw32/dist/install/sea/*.exe $datcordDir/work/ffSetup-win64.exe
cd $datcordDir/work
7z x ffSetup-win64.exe
ls
mv core datcord
rm setup.exe
cd datcord
#mv firefox.exe datcord.exe
cd ..
cp ../windows/datcord.ico datcord/
mkdir datcord/distribution
cp ../distribution/policies-windows.json datcord/distribution/policies.json
cp -r ../open-in-default-browser/* datcord/ 
# Based on librewolf mk.py
mkdir x86-ansi
wget -q -O ./x86-ansi/nsProcess.dll https://sanghai.org/files/nsProcess.dll
wget -q -O ./vc_redist.x64.exe https://aka.ms/vs/17/release/vc_redist.x64.exe
cp ../windows/setup.nsi .
cp ../windows/datcord.ico .
cp ../windows/banner.bmp .
DISPLAY=:0 $mozbuild/wine/bin/wine $mozbuild/nsis/makensis.exe -V1 setup.nsi
# Setup filename will be datcordSetup-win64.exe
