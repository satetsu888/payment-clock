use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::AppError;
use crate::stripe::test_clock::StripeTestClock;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestClock {
    pub id: String,
    pub account_id: String,
    pub stripe_test_clock_id: String,
    pub name: Option<String>,
    pub frozen_time: String,
    pub status: String,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

pub fn upsert_from_stripe(
    conn: &Connection,
    account_id: &str,
    stripe_clock: &StripeTestClock,
) -> Result<String, AppError> {
    let frozen_time =
        chrono::DateTime::from_timestamp(stripe_clock.frozen_time, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();
    let created_at =
        chrono::DateTime::from_timestamp(stripe_clock.created, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

    // Check if already exists
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM test_clocks WHERE account_id = ?1 AND stripe_test_clock_id = ?2",
            params![account_id, stripe_clock.id],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE test_clocks SET name = ?1, frozen_time = ?2, status = ?3 WHERE id = ?4",
            params![stripe_clock.name, frozen_time, stripe_clock.status, id],
        )?;
        Ok(id)
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO test_clocks (id, account_id, stripe_test_clock_id, name, frozen_time, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                account_id,
                stripe_clock.id,
                stripe_clock.name,
                frozen_time,
                stripe_clock.status,
                created_at
            ],
        )?;
        Ok(id)
    }
}

pub fn list_by_account(conn: &Connection, account_id: &str) -> Result<Vec<TestClock>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, stripe_test_clock_id, name, frozen_time, status, created_at, deleted_at
         FROM test_clocks WHERE account_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(params![account_id], |row| {
        Ok(TestClock {
            id: row.get(0)?,
            account_id: row.get(1)?,
            stripe_test_clock_id: row.get(2)?,
            name: row.get(3)?,
            frozen_time: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
            deleted_at: row.get(7)?,
        })
    })?;
    let mut clocks = Vec::new();
    for row in rows {
        clocks.push(row?);
    }
    Ok(clocks)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<TestClock, AppError> {
    let clock = conn.query_row(
        "SELECT id, account_id, stripe_test_clock_id, name, frozen_time, status, created_at, deleted_at
         FROM test_clocks WHERE id = ?1",
        params![id],
        |row| {
            Ok(TestClock {
                id: row.get(0)?,
                account_id: row.get(1)?,
                stripe_test_clock_id: row.get(2)?,
                name: row.get(3)?,
                frozen_time: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        },
    )?;
    Ok(clock)
}

pub fn mark_deleted(conn: &Connection, id: &str, now: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE test_clocks SET status = 'deleted', deleted_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

pub fn purge(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM resource_snapshots WHERE test_clock_id = ?1",
        params![id],
    )?;
    conn.execute(
        "DELETE FROM events WHERE test_clock_id = ?1",
        params![id],
    )?;
    conn.execute(
        "DELETE FROM operations WHERE test_clock_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM test_clocks WHERE id = ?1", params![id])?;
    Ok(())
}
