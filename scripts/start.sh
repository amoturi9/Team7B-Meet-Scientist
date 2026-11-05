#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v brew >/dev/null || ! brew --prefix libsodium >/dev/null 2>&1; then
  echo 'Install the password library first: brew install libsodium'
  exit 1
fi
sodium_prefix="$(brew --prefix libsodium)"
mkdir -p build
clang++ -std=c++17 -pthread -Ibackend/include -I"$sodium_prefix/include" backend/src/main.cpp -L"$sodium_prefix/lib" -lsodium -lsqlite3 -o build/server
exec ./build/server
