import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable
from snowflake.sqlalchemy import dialect as SnowflakeDialect
from database import load_profile, make_engine
from setup_db import build_metadata, generate_samples, load_schema, seed


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.schema = load_schema()
        self.metadata = build_metadata(self.schema)
        self.samples = generate_samples(self.schema)

    def test_schema_seed_repeat_and_constraints(self):
        engine = create_engine('sqlite:///:memory:')
        with engine.begin() as conn:
            self.metadata.create_all(conn)
            seed(conn, self.metadata, self.samples)
            table = self.metadata.tables['Role_Repository']
            conn.execute(table.update().where(table.c.Role_ID == 'ROLE_001').values(Role_Name='User edited'))
            seed(conn, self.metadata, self.samples)
            self.assertEqual(len(inspect(conn).get_table_names()), 7)
            for t in self.metadata.tables.values():
                self.assertEqual(conn.scalar(select(func.count()).select_from(t)), 10)
            self.assertEqual(conn.scalar(select(table.c.Role_Name).where(table.c.Role_ID == 'ROLE_001')), 'User edited')
            self.assertEqual(sum(len(t.columns) for t in self.metadata.tables.values()), 127)
            with self.assertRaises(IntegrityError):
                conn.execute(table.insert().values(Role_ID='ROLE_001'))
            with self.assertRaises(IntegrityError):
                conn.execute(table.insert().values(Role_ID=''))
        engine.dispose()

    def test_dialect_ddl(self):
        for dialect in (sqlite.dialect(), postgresql.dialect(), SnowflakeDialect()):
            for table in self.metadata.tables.values():
                ddl = str(CreateTable(table).compile(dialect=dialect))
                self.assertIn('PRIMARY KEY', ddl)
                self.assertIn('NOT NULL', ddl)

    def test_config_selection_and_missing_secret(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / 'config.json'
            config.write_text(json.dumps({'active_profile': 'local', 'profiles': {
                'local': {'driver': 'sqlite', 'database': 'test.db'},
                'cloud': {'driver': 'postgresql', 'password_env': 'TEST_DB_SECRET_X'}}}))
            with patch.dict(os.environ, {}, clear=True):
                self.assertEqual(load_profile(config)['driver'], 'sqlite')
                with self.assertRaisesRegex(ValueError, 'TEST_DB_SECRET_X'):
                    load_profile(config, 'cloud')
                with patch.dict(os.environ, {'DB_PROFILE': 'cloud'}):
                    self.assertEqual(load_profile(config, 'local')['driver'], 'sqlite')
            engine = make_engine(config, 'local')
            with engine.connect() as conn:
                self.assertEqual(conn.exec_driver_sql('SELECT 1').scalar(), 1)
            engine.dispose()

    def test_sample_references(self):
        roles = {r['Role_ID'] for r in self.samples['Role_Repository']}
        positions = {r['Position_ID'] for r in self.samples['Position_Repository']}
        candidates = {r['Candidate_ID'] for r in self.samples['Candidate_Repository']}
        for row in self.samples['Candidate_Repository']:
            self.assertIn(row['Role_ID'], roles)
            self.assertIn(row['Position_ID'], positions)
        for row in self.samples['Resume_Repository']:
            self.assertIn(row['Candidate_ID'], candidates)


if __name__ == '__main__':
    unittest.main()
