#!/bin/sh

if [ -z "$1" ] || [ -z "$2" ]; then
	echo "usage: send-proof.sh [uid] [url]"
	exit 1
fi

curl -X POST --header 'Content-Type: application/json' -d '
{
	"@id": "1",
	"uid": "'"${1}"'",
	"firstname": "Jesse",
	"lastname": "Digital",
	"email": "jesse@digital.example"
}
' $2
