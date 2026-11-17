"""Build SQL objects from the corrected JSON Schema and seed synthetic records."""
import argparse
import json
from pathlib import Path
from sqlalchemy import Boolean, CheckConstraint, Column, Float, Integer, MetaData, Table, Text, func, select
from sqlalchemy.schema import CreateTable
from jsonschema import Draft202012Validator
from database import ROOT, create_database, make_engine


def load_schema(path=ROOT / 'schema/repositories.json'):
    schema = json.loads(Path(path).read_text())
    Draft202012Validator.check_schema(schema)
    return schema


def build_metadata(schema):
    metadata = MetaData()
    types = {'string': Text, 'boolean': Boolean, 'number': Float, 'integer': Integer}
    for name, obj in schema['properties'].items():
        fields = obj['properties']
        pk = obj['x-primary-key']
        if pk not in fields or not set(obj.get('required', [])).issubset(fields):
            raise ValueError(f'Unknown primary key or required column in {name}')
        columns = []
        for field, spec in fields.items():
            if spec['type'] not in types:
                raise ValueError(f'Unsupported JSON type for {name}.{field}')
            columns.append(Column(field, types[spec['type']](), primary_key=field == pk,
                                  nullable=field != pk and field not in obj.get('required', []),
                                  comment=spec.get('description'), quote=True))
        table = Table(name, metadata, *columns, quote=True)
        for field, spec in fields.items():
            if 'minLength' in spec:
                table.append_constraint(CheckConstraint(func.length(table.c[field]) >= spec['minLength']))
    return metadata


def sample_value(table, name, spec, i):
    lower = name.lower()
    if spec['type'] == 'boolean':
        return False if 'hold' in lower else i % 2 == 0
    if spec['type'] in ('number', 'integer'):
        return i if any(s in lower for s in ('count', 'number', 'total', 'no_of')) else 5 + i % 6
    ids = {'tenant_id': 'TENANT', 'role_id': 'ROLE', 'position_id': 'POSITION',
           'candidate_id': 'CANDIDATE', 'resume_id': 'RESUME', 'audit_id': 'AUDIT',
           'person_interview_candidate_id_0': 'CANDIDATE'}
    if lower in ids:
        return f'{ids[lower]}_{i:03d}'
    if 'email' in lower:
        prefix = 'user' if table == 'user_repository' else 'candidate'
        return f'{prefix}{i:03d}@example.com'
    overrides = {
        'Role_Name': ['Software Engineer', 'Data Analyst', 'QA Engineer', 'Product Designer', 'Data Engineer'][i % 5],
        'Role_Level': 'Mid-level', 'Role_Function': 'Individual contributor',
        'Salary_Range': '80000-120000 USD', 'Hired_Salary': '95000 USD',
        'Department': 'Engineering', 'Location': 'New York', 'Work_Type': 'Hybrid',
        'Hiring_Type': 'Full-time', 'Position_Status': 'Interviewing',
        'Interview_Status': 'Completed', 'Offered_Status': 'Pending',
        'Offered_Rejection_Reason': 'Not applicable', 'Standby_Affirmation_Status': 'Pending',
        'Event_Type': 'INFO', 'Event': 'Synthetic recruitment setup event', 'Time': '14:30:00',
        'Skill': 'Python, SQL', 'Primary_Skill_Object': 'Python, SQL',
        'Primary_Role': f'ROLE_{i:03d}', 'Repeat_Posting': str(i),
        'Posted_Channel': 'Company careers site',
        'Number_Of_Resume_Received_And_Channel': f'Company careers site : {i}',
        'Resume_Posting_Date': f'https://example.com/careers : 11/{i:02d}/2026',
        'Resume_URL': f'https://example.com/resumes/{i:03d}',
        'User_query': 'Show open engineering positions',
        'Graph_query': 'MATCH (p:Position) RETURN p',
    }
    if name in overrides:
        return overrides[name]
    if 'date' in lower:
        return f'12/{i:02d}/2026' if 'expiry' in lower else f'11/{i:02d}/2026'
    return f'Synthetic {name.replace("_", " ").lower()} {i}'


def generate_samples(schema):
    result = {}
    for name, obj in schema['properties'].items():
        rows = []
        for i in range(1, 11):
            row = {field: sample_value(name, field, spec, i) for field, spec in obj['properties'].items()}
            # These events have not happened for the sample open positions/candidates.
            for field in ('Position_Closure_Date', 'On_Hold_Date', 'On_UnHold_Date', 'Offered_Date'):
                row.pop(field, None)
            Draft202012Validator(obj).validate(row)
            rows.append(row)
        result[name] = rows
    return result


def seed(conn, metadata, samples):
    for name, rows in samples.items():
        table = metadata.tables[name]
        pk = list(table.primary_key.columns)[0]
        ids = [row[pk.name] for row in rows]
        existing = set(conn.execute(select(pk).where(pk.in_(ids))).scalars())
        missing = [row for row in rows if row[pk.name] not in existing]
        if missing:
            conn.execute(table.insert(), missing)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=ROOT / 'db_config.json')
    parser.add_argument('--profile', help='Overrides DB_PROFILE and active_profile')
    parser.add_argument('--schema', type=Path, default=ROOT / 'schema/repositories.json')
    parser.add_argument('--create-database', action='store_true', help='Bootstrap catalog (requires CREATE DATABASE permission)')
    parser.add_argument('--no-seed', action='store_true')
    parser.add_argument('--export-sql', type=Path, help='Write table DDL only; do not connect')
    args = parser.parse_args()
    schema = load_schema(args.schema)
    metadata = build_metadata(schema)
    if args.create_database and args.export_sql:
        parser.error('--create-database and --export-sql cannot be combined')
    if args.create_database:
        create_database(args.config, args.profile)
    engine = make_engine(args.config, args.profile)
    try:
        if args.export_sql:
            args.export_sql.parent.mkdir(parents=True, exist_ok=True)
            args.export_sql.write_text('\n\n'.join(str(CreateTable(t).compile(dialect=engine.dialect)) + ';' for t in metadata.sorted_tables) + '\n')
            return
        samples = generate_samples(schema)
        with engine.begin() as conn:
            metadata.create_all(conn)
            if not args.no_seed:
                seed(conn, metadata, samples)
            for table in metadata.sorted_tables:
                print(f'{table.name}: {conn.scalar(select(func.count()).select_from(table))} rows')
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
