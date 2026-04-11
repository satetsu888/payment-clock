use rusqlite_migration::{Migrations, M};

pub fn migrations() -> Migrations<'static> {
    Migrations::new(vec![
        M::up(
            "CREATE TABLE accounts (
                id TEXT PRIMARY KEY,
                stripe_account_id TEXT NOT NULL,
                display_name TEXT,
                api_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_used_at TEXT NOT NULL
            );",
        ),
        M::up(
            "CREATE TABLE test_clocks (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                stripe_test_clock_id TEXT NOT NULL,
                name TEXT,
                frozen_time TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                deleted_at TEXT,
                UNIQUE(account_id, stripe_test_clock_id)
            );",
        ),
        M::up(
            "CREATE TABLE operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                test_clock_id TEXT REFERENCES test_clocks(id),
                operation_type TEXT NOT NULL,
                request_params TEXT,
                response_summary TEXT,
                created_at TEXT NOT NULL
            );",
        ),
        M::up(
            "CREATE TABLE events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                test_clock_id TEXT REFERENCES test_clocks(id),
                stripe_event_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                data_snapshot TEXT NOT NULL,
                stripe_created_at TEXT NOT NULL,
                received_at TEXT NOT NULL,
                source TEXT NOT NULL,
                UNIQUE(account_id, stripe_event_id)
            );",
        ),
        M::up(
            "CREATE TABLE resource_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                test_clock_id TEXT REFERENCES test_clocks(id),
                resource_type TEXT NOT NULL,
                stripe_resource_id TEXT NOT NULL,
                data TEXT NOT NULL,
                captured_at TEXT NOT NULL
            );",
        ),
        M::up(
            "ALTER TABLE accounts ADD COLUMN stripe_api_version TEXT;",
        ),
        M::up(
            "CREATE TABLE resource_snapshots_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                test_clock_id TEXT REFERENCES test_clocks(id),
                resource_type TEXT NOT NULL,
                stripe_resource_id TEXT NOT NULL,
                data TEXT NOT NULL,
                captured_at TEXT NOT NULL,
                UNIQUE(test_clock_id, resource_type, stripe_resource_id)
            );
            INSERT INTO resource_snapshots_new (account_id, test_clock_id, resource_type, stripe_resource_id, data, captured_at)
                SELECT rs.account_id, rs.test_clock_id, rs.resource_type, rs.stripe_resource_id, rs.data, rs.captured_at
                FROM resource_snapshots rs
                INNER JOIN (
                    SELECT test_clock_id, resource_type, stripe_resource_id, MAX(captured_at) AS max_captured_at
                    FROM resource_snapshots
                    GROUP BY test_clock_id, resource_type, stripe_resource_id
                ) latest ON rs.test_clock_id IS latest.test_clock_id
                    AND rs.resource_type = latest.resource_type
                    AND rs.stripe_resource_id = latest.stripe_resource_id
                    AND rs.captured_at = latest.max_captured_at;
            DROP TABLE resource_snapshots;
            ALTER TABLE resource_snapshots_new RENAME TO resource_snapshots;",
        ),
    ])
}
