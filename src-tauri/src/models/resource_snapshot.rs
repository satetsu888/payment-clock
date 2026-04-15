use std::collections::HashMap;
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
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(test_clock_id, resource_type, stripe_resource_id)
         DO UPDATE SET data = excluded.data, captured_at = excluded.captured_at",
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCounts {
    pub customer_count: u32,
    pub subscription_count: u32,
}

/// Count customers and subscriptions per test clock for an account
pub fn count_by_test_clock(
    conn: &Connection,
    account_id: &str,
) -> Result<HashMap<String, ResourceCounts>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT test_clock_id, resource_type, COUNT(*) as cnt
         FROM resource_snapshots
         WHERE account_id = ?1
           AND resource_type IN ('customer', 'subscription')
           AND test_clock_id IS NOT NULL
         GROUP BY test_clock_id, resource_type",
    )?;
    let rows = stmt.query_map(params![account_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, u32>(2)?,
        ))
    })?;

    let mut map: HashMap<String, ResourceCounts> = HashMap::new();
    for row in rows {
        let (test_clock_id, resource_type, count) = row?;
        let entry = map.entry(test_clock_id).or_insert(ResourceCounts {
            customer_count: 0,
            subscription_count: 0,
        });
        match resource_type.as_str() {
            "customer" => entry.customer_count = count,
            "subscription" => entry.subscription_count = count,
            _ => {}
        }
    }
    Ok(map)
}

/// Get all snapshots for a resource type (one per resource due to UNIQUE constraint)
pub fn list_latest_by_resource(
    conn: &Connection,
    test_clock_id: &str,
    resource_type: &str,
) -> Result<Vec<ResourceSnapshot>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, test_clock_id, resource_type, stripe_resource_id, data, captured_at
         FROM resource_snapshots
         WHERE test_clock_id = ?1 AND resource_type = ?2",
    )?;
    let snapshots = stmt
        .query_map(params![test_clock_id, resource_type], |row| {
            Ok(ResourceSnapshot {
                id: row.get(0)?,
                account_id: row.get(1)?,
                test_clock_id: row.get(2)?,
                resource_type: row.get(3)?,
                stripe_resource_id: row.get(4)?,
                data: row.get(5)?,
                captured_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(snapshots)
}

