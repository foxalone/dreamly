#!/bin/bash
# Пуш фикса сборки (commit 0313842) в main
set -e
cd "$(dirname "$0")"
git push origin main
