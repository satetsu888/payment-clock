use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::db::migrations::migrations;
use crate::error::AppError;

pub fn initialize_db(app_handle: &AppHandle) -> Result<Connection, AppError> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("payment_clock.db");
    let mut conn = Connection::open(db_path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrations()
        .to_latest(&mut conn)
        .map_err(|e| AppError::Db(rusqlite::Error::InvalidParameterName(e.to_string())))?;
    Ok(conn)
}
