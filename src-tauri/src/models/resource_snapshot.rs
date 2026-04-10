use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceSnapshot {
    pub id: i64,
    pub account_id: String,
    pub test_clock_id: Option<String>,
    pub resource_type: String,
    pub stripe_resource_id: String,
    pub data: String,
    pub captured_at: String,
}

pub fn save_snapshot(
    conn: &Connection,
    account_id: &str,
    test_clock_id: Option<&str>,
    resource_type: &str,
    stripe_resource_id: &str,
    data: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO resource_snapshots (account_id, test_clock_id, resource_type, stripe_resource_id, data, captured_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            account_id,
            test_clock_id,
            resource_type,
            stripe_resource_id,
            data,
            now
        ],
    )?;
    Ok(())
}

pub fn list_latest_by_test_clock_and_type(
    conn: &Connection,
    test_clock_id: &str,
    resource_type: &str,
) -> Result<Vec<ResourceSnapshot>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT rs.id, rs.account_id, rs.test_clock_id, rs.resource_type, rs.stripe_resource_id, rs.data, rs.captured_at
         FROM resource_snapshots rs
         INNER JOIN (
             SELECT stripe_resource_id, MAX(captured_at) as max_captured
             FROM resource_snapshots
             WHERE test_clock_id = ?1 AND resource_type = ?2
             GROUP BY stripe_resource_id
         ) latest ON rs.stripe_resource_id = latest.stripe_resource_id AND rs.captured_at = latest.max_captured
         WHERE rs.test_clock_id = ?1 AND rs.resource_type = ?2
         ORDER BY rs.captured_at DESC",
    )?;
    let rows = stmt.query_map(params![test_clock_id, resource_type], |row| {
        Ok(ResourceSnapshot {
            id: row.get(0)?,
            account_id: row.get(1)?,
            test_clock_id: row.get(2)?,
            resource_type: row.get(3)?,
            stripe_resource_id: row.get(4)?,
            data: row.get(5)?,
            captured_at: row.get(6)?,
        })
    })?;
    let mut snapshots = Vec::new();
    for row in rows {
        snapshots.push(row?);
    }
    Ok(snapshots)
}
