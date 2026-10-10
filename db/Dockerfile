# PostgreSQL + PostGIS, built from the official images so it runs on both
# amd64 (dev PCs) and arm64 (Oracle Cloud Ampere VMs): the postgis/postgis
# image is published for amd64 only.
#
# The PostGIS package comes from the official PostgreSQL apt repository
# (PGDG), already configured in the postgres image. The package name pins
# PostGIS 3.x; PGDG only keeps the latest 3.x release, so the minor version
# cannot be pinned reliably.
#
# The extension itself is not created here: the first migration that needs
# it runs `CREATE EXTENSION IF NOT EXISTS postgis`.
FROM postgres:17

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
  && rm -rf /var/lib/apt/lists/*
