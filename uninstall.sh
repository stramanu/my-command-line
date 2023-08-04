#!/bin/bash

set -e

echo ">_ Uninstalling mcl..."

node_ver_dir="./node_ver/$(node -v)"

cd "$node_ver_dir"

npm unlink

rm -rf /usr/local/bin/mcl

clear

printf ">_ mcl Management CLI uninstalled!\n"