use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub stripe_account_id: String,
    pub display_name: Option<String>,
    pub created_at: String,
    pub last_used_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub id: String,
    pub stripe_account_id: String,
    pub display_name: Option<String>,
    pub last_used_at: String,
}

pub fn insert_account(
    conn: &Connection,
    id: &str,
    stripe_account_id: &str,
    display_name: Option<&str>,
    api_key: &str,
    now: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO accounts (id, stripe_account_id, display_name, api_key, created_at, last_used_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, stripe_account_id, display_name, api_key, now],
    )?;
    Ok(())
}

pub fn list_accounts(conn: &Connection) -> Result<Vec<AccountSummary>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, stripe_account_id, display_name, last_used_at
         FROM accounts ORDER BY last_used_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(AccountSummary {
            id: row.get(0)?,
            stripe_account_id: row.get(1)?,
            display_name: row.get(2)?,
            last_used_at: row.get(3)?,
        })
    })?;
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row?);
    }
    Ok(accounts)
}

pub fn get_account(conn: &Connection, account_id: &str) -> Result<Account, AppError> {
    let account = conn.query_row(
        "SELECT id, stripe_account_id, display_name, created_at, last_used_at
         FROM accounts WHERE id = ?1",
        params![account_id],
        |row| {
            Ok(Account {
                id: row.get(0)?,
                stripe_account_id: row.get(1)?,
                display_name: row.get(2)?,
                created_at: row.get(3)?,
                last_used_at: row.get(4)?,
            })
        },
    )?;
    Ok(account)
}

pub fn get_api_key(conn: &Connection, account_id: &str) -> Result<String, AppError> {
    let api_key: String = conn.query_row(
        "SELECT api_key FROM accounts WHERE id = ?1",
        params![account_id],
        |row| row.get(0),
    )?;
    Ok(api_key)
}

pub fn update_last_used(conn: &Connection, account_id: &str, now: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE accounts SET last_used_at = ?1 WHERE id = ?2",
        params![now, account_id],
    )?;
    Ok(())
}

pub fn delete_account(conn: &Connection, account_id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM accounts WHERE id = ?1", params![account_id])?;
    Ok(())
}

pub fn find_by_stripe_account_id(
    conn: &Connection,
    stripe_account_id: &str,
) -> Result<Option<Account>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, stripe_account_id, display_name, created_at, last_used_at
         FROM accounts WHERE stripe_account_id = ?1",
    )?;
    let mut rows = stmt.query_map(params![stripe_account_id], |row| {
        Ok(Account {
            id: row.get(0)?,
            stripe_account_id: row.get(1)?,
            display_name: row.get(2)?,
            created_at: row.get(3)?,
            last_used_at: row.get(4)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}
