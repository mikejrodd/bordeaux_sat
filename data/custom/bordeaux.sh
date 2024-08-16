#!/usr/bin/env bash
# Script to add Bordeaux satellite TLEs to the output directory
set -u
cd "${0%/*}"

DATA_DIR=$1
TLE_DIR=${DATA_DIR}/tle
OUT_DIR=$2/tle
mkdir -p "$OUT_DIR"

# Copy the Bordeaux TLEs to the output directory
cp "${TLE_DIR}/Bordeaux.txt" "${OUT_DIR}/Bordeaux.txt"
