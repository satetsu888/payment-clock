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

/// Get the latest snapshot per resource
pub fn list_latest_by_resource(
    conn: &Connection,
    test_clock_id: &str,
    resource_type: &str,
) -> Result<Vec<ResourceSnapshot>, AppError> {
    // First get distinct resource IDs
    let mut id_stmt = conn.prepare(
        "SELECT DISTINCT stripe_resource_id FROM resource_snapshots
         WHERE test_clock_id = ?1 AND resource_type = ?2",
    )?;
    let resource_ids: Vec<String> = id_stmt
        .query_map(params![test_clock_id, resource_type], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let mut snapshots = Vec::new();
    for rid in &resource_ids {
        // Get the latest snapshot for each resource
        let snap = conn.query_row(
            "SELECT id, account_id, test_clock_id, resource_type, stripe_resource_id, data, captured_at
             FROM resource_snapshots
             WHERE test_clock_id = ?1 AND resource_type = ?2 AND stripe_resource_id = ?3
             ORDER BY captured_at DESC LIMIT 1",
            params![test_clock_id, resource_type, rid],
            |row| {
                Ok(ResourceSnapshot {
                    id: row.get(0)?,
                    account_id: row.get(1)?,
                    test_clock_id: row.get(2)?,
                    resource_type: row.get(3)?,
                    stripe_resource_id: row.get(4)?,
                    data: row.get(5)?,
                    captured_at: row.get(6)?,
                })
            },
        );
        if let Ok(s) = snap {
            snapshots.push(s);
        }
    }
    Ok(snapshots)
}

/// Get the previous status for a resource by looking at the second-latest snapshot
pub fn get_previous_status(
    conn: &Connection,
    test_clock_id: &str,
    resource_type: &str,
    stripe_resource_id: &str,
) -> Result<Option<String>, AppError> {
    // Get the two most recent snapshots
    let mut stmt = conn.prepare(
        "SELECT data FROM resource_snapshots
         WHERE test_clock_id = ?1 AND resource_type = ?2 AND stripe_resource_id = ?3
         ORDER BY captured_at DESC LIMIT 2",
    )?;
    let rows: Vec<String> = stmt
        .query_map(params![test_clock_id, resource_type, stripe_resource_id], |row| {
            row.get(0)
        })?
        .collect::<Result<Vec<_>, _>>()?;

    if rows.len() < 2 {
        return Ok(None); // No previous snapshot
    }

    // Parse the second (previous) snapshot and extract status
    let prev: serde_json::Value = serde_json::from_str(&rows[1])?;
    Ok(prev["status"].as_str().map(|s| s.to_string()))
}
