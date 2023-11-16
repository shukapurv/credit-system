#!/bin/sh

set -e

host="$1"
shift
cmd="$@"

# Loop until we can successfully execute a query against the database
until mysql -h "$host" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e 'SELECT 1' &>/dev/null; do
  >&2 echo "MySQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "MySQL is up - executing command"
exec $cmd
