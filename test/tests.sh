#!/bin/bash

# Make sure we are in the test root in case the script was called from outside the root
cd ${BASH_SOURCE%/*}

./legacy.sh
./stable.sh

# Tidy up
cd -