use std::sync::{Arc, Mutex};

use rusqlite::Connection;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::error::AppError;
use crate::models::event as event_model;
use crate::stripe::event::extract_test_clock_id;

/// Start `stripe listen` subprocess and stream events.
/// Events are saved to DB and emitted to the frontend via Tauri events.
pub async fn start_listening(
    api_key: &str,
    account_id: &str,
    app_handle: tauri::AppHandle,
    db: Arc<Mutex<Connection>>,
    cli_process: Arc<Mutex<Option<tokio::process::Child>>>,
) -> Result<(), AppError> {
    let mut child = Command::new("stripe")
        .args(["listen", "--api-key", api_key, "--format", "json"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                AppError::Validation(
                    "Stripe CLI not found. Please install it: https://docs.stripe.com/stripe-cli"
                        .to_string(),
                )
            } else {
                AppError::Io(e)
            }
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::Stripe("Failed to capture CLI stdout".to_string()))?;

    // Store the child process
    {
        let mut cli = cli_process.lock().unwrap();
        *cli = Some(child);
    }

    let account_id = account_id.to_string();
    let cli_process_clone = cli_process.clone();

    // Spawn a task to read stdout lines
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while let Ok(Some(line)) = lines.next_line().await {
            // Try to parse as JSON event
            let parsed: Result<serde_json::Value, _> = serde_json::from_str(&line);
            let ev = match parsed {
                Ok(v) => v,
                Err(_) => continue, // Skip non-JSON lines (status messages, etc.)
            };

            // Must have an "id" field to be a valid event
            let stripe_event_id = match ev["id"].as_str() {
                Some(id) if id.starts_with("evt_") => id,
                _ => continue,
            };

            let event_type = ev["type"].as_str().unwrap_or_default();
            let resource_type = ev["data"]["object"]["object"].as_str();
            let resource_id = ev["data"]["object"]["id"].as_str();
            let created = ev["created"].as_i64().unwrap_or(0);
            let stripe_created_at = chrono::DateTime::from_timestamp(created, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default();
            let now = chrono::Utc::now().to_rfc3339();

            // Resolve test clock
            let stripe_tc_id = extract_test_clock_id(&ev);
            let local_tc_id = stripe_tc_id.as_deref().and_then(|stc| {
                let db = db.lock().unwrap();
                db.query_row(
                    "SELECT id FROM test_clocks WHERE account_id = ?1 AND stripe_test_clock_id = ?2",
                    rusqlite::params![account_id, stc],
                    |row| row.get::<_, String>(0),
                )
                .ok()
            });

            // Save to DB
            {
                let db = db.lock().unwrap();
                let _ = event_model::record_event(
                    &db,
                    &account_id,
                    local_tc_id.as_deref(),
                    stripe_event_id,
                    event_type,
                    resource_type,
                    resource_id,
                    &ev.to_string(),
                    &stripe_created_at,
                    &now,
                    "cli",
                );
            }

            // Emit to frontend
            let _ = app_handle.emit("stripe-event", &ev);
        }

        // Process ended — clean up
        let mut cli = cli_process_clone.lock().unwrap();
        *cli = None;
    });

    Ok(())
}
