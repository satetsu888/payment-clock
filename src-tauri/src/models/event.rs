use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: i64,
    pub account_id: String,
    pub test_clock_id: Option<String>,
    pub stripe_event_id: String,
    pub event_type: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub data_snapshot: String,
    pub stripe_created_at: String,
    pub received_at: String,
    pub source: String,
}

/// Insert event, ignoring duplicates (UNIQUE constraint on account_id + stripe_event_id)
pub fn record_event(
    conn: &Connection,
    account_id: &str,
    test_clock_id: Option<&str>,
    stripe_event_id: &str,
    event_type: &str,
    resource_type: Option<&str>,
    resource_id: Option<&str>,
    data_snapshot: &str,
    stripe_created_at: &str,
    received_at: &str,
    source: &str,
) -> Result<bool, AppError> {
    let result = conn.execute(
        "INSERT OR IGNORE INTO events
         (account_id, test_clock_id, stripe_event_id, event_type, resource_type, resource_id, data_snapshot, stripe_created_at, received_at, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            account_id,
            test_clock_id,
            stripe_event_id,
            event_type,
            resource_type,
            resource_id,
            data_snapshot,
            stripe_created_at,
            received_at,
            source,
        ],
    )?;
    Ok(result > 0) // true if inserted, false if duplicate
}

pub fn list_by_test_clock(
    conn: &Connection,
    test_clock_id: &str,
) -> Result<Vec<Event>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, test_clock_id, stripe_event_id, event_type, resource_type, resource_id, data_snapshot, stripe_created_at, received_at, source
         FROM events WHERE test_clock_id = ?1 ORDER BY stripe_created_at DESC",
    )?;
    let rows = stmt.query_map(params![test_clock_id], row_to_event)?;
    let mut events = Vec::new();
    for row in rows {
        events.push(row?);
    }
    Ok(events)
}

pub fn get_latest_timestamp(
    conn: &Connection,
    account_id: &str,
) -> Result<Option<String>, AppError> {
    let result: Option<String> = conn
        .query_row(
            "SELECT MAX(stripe_created_at) FROM events WHERE account_id = ?1",
            params![account_id],
            |row| row.get(0),
        )
        .ok()
        .flatten();
    Ok(result)
}

fn row_to_event(row: &rusqlite::Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get(0)?,
        account_id: row.get(1)?,
        test_clock_id: row.get(2)?,
        stripe_event_id: row.get(3)?,
        event_type: row.get(4)?,
        resource_type: row.get(5)?,
        resource_id: row.get(6)?,
        data_snapshot: row.get(7)?,
        stripe_created_at: row.get(8)?,
        received_at: row.get(9)?,
        source: row.get(10)?,
    })
}
