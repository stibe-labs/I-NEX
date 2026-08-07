#!/bin/bash
sudo -u postgres psql -c "CREATE DATABASE inex_db;"
sudo -u postgres psql -c "CREATE USER inex_user WITH ENCRYPTED PASSWORD 'inex_secure_pass_123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE inex_db TO inex_user;"
sudo -u postgres psql -c "ALTER DATABASE inex_db OWNER TO inex_user;"
