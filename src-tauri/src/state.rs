use rusqlite::Connection;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub cli_process: Arc<Mutex<Option<tokio::process::Child>>>,
}
