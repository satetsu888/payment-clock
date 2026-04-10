use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Operation {
    pub id: i64,
    pub account_id: String,
    pub test_clock_id: Option<String>,
    pub operation_type: String,
    pub request_params: Option<String>,
    pub response_summary: Option<String>,
    pub created_at: String,
}

pub fn record(
    conn: &Connection,
    account_id: &str,
    test_clock_id: Option<&str>,
    operation_type: &str,
    request_params: Option<&str>,
    response_summary: Option<&str>,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO operations (account_id, test_clock_id, operation_type, request_params, response_summary, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            account_id,
            test_clock_id,
            operation_type,
            request_params,
            response_summary,
            now
        ],
    )?;
    Ok(())
}

pub fn list_by_test_clock(
    conn: &Connection,
    test_clock_id: &str,
) -> Result<Vec<Operation>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, test_clock_id, operation_type, request_params, response_summary, created_at
         FROM operations WHERE test_clock_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(params![test_clock_id], |row| {
        Ok(Operation {
            id: row.get(0)?,
            account_id: row.get(1)?,
            test_clock_id: row.get(2)?,
            operation_type: row.get(3)?,
            request_params: row.get(4)?,
            response_summary: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;
    let mut ops = Vec::new();
    for row in rows {
        ops.push(row?);
    }
    Ok(ops)
}
