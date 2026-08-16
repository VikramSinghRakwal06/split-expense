-- One database per service: each owns its schema outright and no service may
-- read another's tables. auth-service uses POSTGRES_DB (splitexpense_auth),
-- created by the postgres image itself before this script runs.
CREATE DATABASE splitexpense_group;
CREATE DATABASE splitexpense_expense;
CREATE DATABASE splitexpense_notification;
