#!/bin/bash

input_file=$1
output_name=$2

function script_usage() {
    cat << EOF
Usage:
    sh $0 <input_file_ppk> <output_name>

Ex.:
    sh $0 id_rsa.ppk name
EOF
exit 0
}

function run() {
    # echo "puttygen $input_file -O private-openssh -o $output_name"
    puttygen $input_file -O private-openssh -o $output_name
    puttygen $input_file -O public-openssh -o $output_name.pub
    mv {$output_name,$output_name.pub} ~/.ssh
    chmod 600 ~/.ssh/$output_name
    chmod 666 ~/.ssh/$output_name_id_rsa.pub
    ssh-add -K ~/.ssh/$output_name_id_rsa
    echo "Created \\033[0;36m~/.ssh/$output_name_id_rsa\\033[0m and \\033[0;36m~/.ssh/$output_name_id_rsa.pub\\033[0m"
}

function main() {
    
    if [ "$input_file" == "" ] || [ "$output_name" == "" ]
    then
        script_usage
    else
        run
    fi
    
}


# Make it rain
main "$@"

