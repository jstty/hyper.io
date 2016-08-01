#!/bin/bash

ALL_VERSIONS="0.10 0.12 4.4 5.12 6.3"
TEST='mocha --check-leaks -t 5000 -b -R spec test/tests.js'

# run function
run() {
	$1
	if [ $? -eq 0 ]; then
		echo "All OK!"
	else
		echo "================================================="
		break
	fi
}

echo "================================================="
echo "-- Building Code..."
cd ..
run "npm run-script compile"

for V in $ALL_VERSIONS; do
	echo "================================================="
	echo "-- Testing Node v${V} ..."
	
	echo "-------------------------------------------------"
	echo "- Swiching Node versions..."
	echo "-------------------------------------------------"
	run "sudo n $V"
	
	echo "-------------------------------------------------"
	echo "- Running Tests..."
	echo "-------------------------------------------------"
	run "$TEST"
	
done
