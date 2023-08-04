#!/bin/bash

set -e

echo ">_ Installing mcl..."

node_ver_dir="./node_ver/$(node -v)"

mkdir -p "$node_ver_dir"

cd "$node_ver_dir"

cp ../../package.json package.json
cp -r ../../app/* ./

npm install
npm link

clear

printf ">_ mcl \"Management CLI installed!!\\n Now you can run \\033[0;36mmcl\\033[0m in your shell\n"