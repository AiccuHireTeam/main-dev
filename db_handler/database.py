"""Connection selection shared by setup and application code. No embedded secrets."""
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

ROOT = Path(__file__).resolve().parent


def load_profile(config=ROOT / 'db_config.json', profile=None):
    path = Path(config).resolve()
    cfg = json.loads(path.read_text())
    name = profile or os.getenv('DB_PROFILE') or cfg['active_profile']
    if name not in cfg['profiles']:
        raise ValueError(f'Unknown database profile: {name}')
    values = {}
    for key, value in cfg['profiles'][name].items():
        if key.endswith('_env'):
            if not os.getenv(value):
                raise ValueError(f'Profile {name} requires environment variable {value}')
            values[key[:-4]] = os.environ[value]
        else:
            values[key] = value
    if values['driver'] == 'sqlite':
        values['database'] = str((path.parent / values['database']).resolve())
    return values


def make_engine(config=ROOT / 'db_config.json', profile=None, bootstrap=False):
    p = load_profile(config, profile)
    driver = p['driver']
    if driver == 'sqlite':
        Path(p['database']).parent.mkdir(parents=True, exist_ok=True)
        url = URL.create('sqlite', database=p['database'])
    elif driver == 'postgresql':
        query = {k: str(p[k]) for k in ('sslmode', 'sslrootcert', 'sslcert', 'sslkey') if k in p}
        url = URL.create('postgresql+psycopg', username=p['username'], password=p['password'],
                         host=p['host'], port=int(p.get('port', 5432)),
                         database=p.get('admin_database', 'postgres') if bootstrap else p['database'],
                         query=query)
    elif driver == 'snowflake':
        from snowflake.sqlalchemy import URL as SnowflakeURL
        args = dict(account=p['account'], user=p['username'], password=p['password'])
        args.update({k: p[k] for k in ('warehouse', 'role') if k in p})
        if not bootstrap:
            args.update(database=p['database'], schema=p.get('schema', 'PUBLIC'))
        url = SnowflakeURL(**args)
    else:
        raise ValueError(f'Unsupported database driver: {driver}')
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)


def create_database(config=ROOT / 'db_config.json', profile=None):
    """Explicit bootstrap; cloud infrastructure and credentials must already exist."""
    p = load_profile(config, profile)
    if p['driver'] == 'sqlite':
        return
    engine = make_engine(config, profile, bootstrap=True)
    quote = engine.dialect.identifier_preparer.quote_identifier
    try:
        with engine.connect().execution_options(isolation_level='AUTOCOMMIT') as conn:
            if p['driver'] == 'postgresql':
                from sqlalchemy import text
                exists = conn.execute(text('SELECT 1 FROM pg_database WHERE datname=:name'),
                                      {'name': p['database']}).scalar()
                if not exists:
                    conn.exec_driver_sql('CREATE DATABASE ' + quote(p['database']))
            else:
                conn.exec_driver_sql('CREATE DATABASE IF NOT EXISTS ' + quote(p['database']))
                conn.exec_driver_sql('CREATE SCHEMA IF NOT EXISTS ' + quote(p['database']) + '.'
                                     + quote(p.get('schema', 'PUBLIC')))
    finally:
        engine.dispose()
