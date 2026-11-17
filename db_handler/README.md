# Recruitment database setup

Seven SQL tables, 127 columns, and 10 synthetic records per table (70 total) from the supplied JSON. The default `local` profile creates `data/recruitment.db` using SQLite. PostgreSQL is available locally through Docker; GCP Cloud SQL and AWS RDS/Aurora PostgreSQL use the same PostgreSQL driver. Snowflake uses its SQLAlchemy dialect.

## Run locally

Python 3.11+ recommended. `requirements-lock.txt` records the versions tested here; install it instead of `requirements.txt` to reproduce those versions. From this directory:

```bash
python3.11 -m venv .venv311
.venv311/bin/pip install -r requirements.txt
.venv311/bin/python setup_db.py
.venv311/bin/python -m unittest -v
```

`setup_db.py` creates missing tables and inserts missing sample primary keys. Repeating it preserves existing rows and user edits. Run only one setup process at a time. `--no-seed` creates tables without samples. Existing table definitions are not migrated: changing the schema requires a separate migration.

## Local PostgreSQL

Install Docker with Compose first, then:

```bash
export LOCAL_DB_PASSWORD='choose-a-local-password'
docker compose up -d --wait
.venv311/bin/python setup_db.py --profile local_postgres
```

Compose creates the `recruitment` database and persists it in a named volume. Alternatively, point the profile at an existing PostgreSQL installation and use `--create-database` if the catalog does not yet exist and your account has permission. PostgreSQL database bootstrap connects to `postgres` by default; set `admin_database` in the profile to change it.

## Switch databases

Edit `active_profile` in `db_config.json` to `local`, `local_postgres`, `gcp`, `aws`, or `snowflake`. Selection precedence is `--profile`, then the `DB_PROFILE` environment variable, then `active_profile`. Connection code is in the separate `database.py` file; applications can import `make_engine()`.

Switching selects a different target; it does **not** migrate existing records between databases. Running setup on a new target creates the objects and synthetic data there. No cloud resources are provisioned by this script.

### GCP Cloud SQL for PostgreSQL

Set the following environment variables to your instance endpoint, database account, password, and trusted server CA file:

```bash
export GCP_DB_HOST='your-postgresql-endpoint'
export GCP_DB_USER='your-db-user'
export GCP_DB_PASSWORD='your-db-password'
export GCP_DB_SSLROOTCERT='/absolute/path/to/server-ca.pem'
.venv311/bin/python setup_db.py --profile gcp --create-database
```

The supplied cloud profiles use direct PostgreSQL connections with TLS hostname verification. Configure a reachable endpoint, networking permissions and a certificate matching the endpoint. If the instance requires client certificates, add `sslcert_env` and `sslkey_env` entries to its profile and set the named variables. If using the Cloud SQL Auth Proxy instead, edit host/port/TLS settings to match your proxy configuration.

### AWS RDS or Aurora PostgreSQL

```bash
export AWS_DB_HOST='your-instance.region.rds.amazonaws.com'
export AWS_DB_USER='your-db-user'
export AWS_DB_PASSWORD='your-db-password'
export AWS_DB_SSLROOTCERT='/absolute/path/to/rds-ca-bundle.pem'
.venv311/bin/python setup_db.py --profile aws --create-database
```

Provide an existing PostgreSQL instance, network/security-group access and a trusted CA bundle. AWS Redshift is not the PostgreSQL target of this profile. Omit `--create-database` when the database already exists and the account has only table creation permissions.

### Snowflake

```bash
export SNOWFLAKE_ACCOUNT='organization-account'
export SNOWFLAKE_USER='your-user'
export SNOWFLAKE_PASSWORD='your-password'
export SNOWFLAKE_WAREHOUSE='your-warehouse'
export SNOWFLAKE_ROLE='your-role'
.venv311/bin/python setup_db.py --profile snowflake --create-database
```

This example uses password authentication, which must be allowed by your account policy. For browser SSO or key-pair authentication, adapt `make_engine()` to that authentication method. The warehouse and role must exist. Bootstrap creates `RECRUITMENT.PUBLIC`; omit it if already provisioned. The role needs usage on the warehouse/database/schema and appropriate creation and DML privileges.

Snowflake standard-table primary keys are informational and do not enforce uniqueness. The seeder checks existing IDs, but is not safe for concurrent seeders on Snowflake. DDL may commit independently of data insertion. See [Snowflake constraints](https://docs.snowflake.com/en/sql-reference/constraints).

## Files and schema decisions

- `schema/all_objects_repo.original.json`: untouched source copy.
- `schema/repositories.json`: corrected executable schema.
- `setup_db.py`: schema-to-table mapping, synthetic samples, seeding and SQL export.
- `database.py`: configuration loading, connections and optional catalog creation.
- `db_config.json`: backend profiles; credentials are read from environment variables.
- `sample_data.json`: realistic fictional examples for inspection; candidate identities are invented and use `example.com` addresses.
- `sql/`: table DDL generated for SQLite, PostgreSQL and Snowflake.
- `data/recruitment.db`: the created local database, excluded from Git.

The original file was invalid JSON: the empty Admin object's properties were closed without closing the Admin object. The corrected copy closes Admin and places all seven repositories under root `properties`. `user_repository` was located outside the intended root properties after fixing that brace, so it was moved into them. The missing `Tenant_id` field was inferred as a required string from Admin's declared primary key. The user primary key and required field were corrected from `USER_EMAIL_ID` to the existing `user_email_id`. No other source columns were removed or renamed.

Strings remain text, numbers become floating-point SQL numbers, and booleans become Boolean. Required fields and primary keys are NOT NULL; declared minimum string lengths become CHECK constraints. Quoted SQL names preserve spelling and capitalization, including in Snowflake. Dates, salary ranges, lists, and documents declared as strings remain strings; future normalization needs a separate design decision. Optional dates for events that have not happened are left NULL in the sample data. All samples are fictional.

No foreign keys, email uniqueness constraints, tenant linkage columns, indexes, views, or procedures were declared in the source; none were invented. Sample role/position/candidate identifiers nevertheless align across tables. The empty Admin definition only produces a `Tenant_id` column. This is not a tenant isolation implementation.

## Inspect and export

```bash
.venv311/bin/python setup_db.py --export-sql sql/sqlite.sql
# Target profile environment variables are required, but export does not connect:
.venv311/bin/python setup_db.py --profile local_postgres --export-sql sql/postgresql.sql
```

Example query (quoted identifiers work across the targets):

```sql
SELECT "Candidate_ID", "Candidate_Email_Address", "Role_ID"
FROM "Candidate_Repository";
```

Local SQLite execution and repeat seeding are tested. PostgreSQL and Snowflake DDL are compiled in tests; actual server/cloud connectivity requires your installed services and credentials and has not been integration-tested here.
