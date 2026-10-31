Schema version 1 is installed transactionally by `python -m app.migrate`, under an advisory lock.
Deploy using a migration database role allowed to create the vector extension. API/worker roles only
need data access to existing tables. Future versions must add explicit migrations; never change an
existing deployed baseline to alter existing tables. Back up before upgrades and test restore paths.
