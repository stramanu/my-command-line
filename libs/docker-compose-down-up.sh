#!/bin/bash

env=$1

function main() {
    
    if [ "$env" == "" ] || [ "$env" == "undefined" ]
    then
        echo "CMD: \\033[0;36mdocker-compose down && docker-compose up\\033[0m"
        docker-compose down && docker-compose up
    else
        echo "CMD: \\033[0;36mdocker-compose down && docker-compose -f docker-compose.yml -f docker-compose.$env.yml up\\033[0m"
        docker-compose down && docker-compose -f docker-compose.yml -f docker-compose.$env.yml up
    fi
    
}


# Make it rain
main "$@"

