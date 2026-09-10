#!/usr/bin/env bash
# exit on error
set -o errexit

npm install --prefix frontend
npm run build --prefix frontend

pip install -r backend/requirements.txt
