#!/bin/sh

cd neutron
python configurator.py --config-file=../resources/config.json -b $@
