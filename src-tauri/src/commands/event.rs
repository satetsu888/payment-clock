use tauri::State;

use crate::error::AppError;
use crate::models::{account, event};
use crate::state::AppState;
use crate::stripe;

/// Resolve a stripe_test_clock_id to a local test_clock.id
fn resolve_test_clock_id(
    conn: &rusqlite::Connection,
    account_id: &str,
    stripe_test_clock_id: &str,
) -> Option<String> {
    conn.query_row(
        "SELECT id FROM test_clocks WHERE account_id = ?1 AND stripe_test_clock_id = ?2",
        rusqlite::params![account_id, stripe_test_clock_id],
        |row| row.get::<_, String>(0),
    )
    .ok()
}

#[tauri::command]
pub async fn fetch_events(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: Option<String>,
) -> Result<Vec<event::Event>, AppError> {
    // Get API key and latest timestamp for incremental fetch
    let (api_key, latest_ts) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let latest = event::get_latest_timestamp(&db, &account_id)?;
        (api_key, latest)
    };

    // Parse latest timestamp to Unix epoch for Stripe API
    let created_after = latest_ts.and_then(|ts| {
        chrono::DateTime::parse_from_rfc3339(&ts)
            .ok()
            .map(|dt| dt.timestamp())
    });

    let events = stripe::event::fetch_events(&api_key, created_after).await?;

    // Save events to DB
    {
        let db = state.db.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        for ev in &events {
            let stripe_event_id = ev["id"].as_str().unwrap_or_default();
            let event_type = ev["type"].as_str().unwrap_or_default();
            let resource_type = ev["data"]["object"]["object"].as_str();
            let resource_id = ev["data"]["object"]["id"].as_str();
            let created = ev["created"].as_i64().unwrap_or(0);
            let stripe_created_at = chrono::DateTime::from_timestamp(created, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default();

            // Resolve test clock
            let stripe_tc_id = stripe::event::extract_test_clock_id(ev);
            let local_tc_id = stripe_tc_id
                .as_deref()
                .and_then(|stc| resolve_test_clock_id(&db, &account_id, stc));

            event::record_event(
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
                "api",
            )?;
        }
    }

    // Return events for the requested test clock (or all)
    let db = state.db.lock().unwrap();
    match test_clock_id {
        Some(tc_id) => event::list_by_test_clock(&db, &tc_id),
        None => {
            // Return all recent events for the account
            let mut stmt = db.prepare(
                "SELECT id, account_id, test_clock_id, stripe_event_id, event_type, resource_type, resource_id, data_snapshot, stripe_created_at, received_at, source
                 FROM events WHERE account_id = ?1 ORDER BY stripe_created_at DESC LIMIT 100",
            )?;
            let rows = stmt.query_map(rusqlite::params![account_id], |row| {
                Ok(event::Event {
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
            })?;
            let mut result = Vec::new();
            for row in rows {
                result.push(row?);
            }
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn get_test_clock_events(
    state: State<'_, AppState>,
    test_clock_id: String,
) -> Result<Vec<event::Event>, AppError> {
    let db = state.db.lock().unwrap();
    event::list_by_test_clock(&db, &test_clock_id)
}

#[tauri::command]
pub async fn start_stripe_cli(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    account_id: String,
) -> Result<(), AppError> {
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };

    // Check if already running
    {
        let cli = state.cli_process.lock().unwrap();
        if cli.is_some() {
            return Err(AppError::Validation(
                "Stripe CLI is already running".to_string(),
            ));
        }
    }

    let db_mutex = state.db.clone();
    let account_id_clone = account_id.clone();

    stripe::cli::start_listening(
        &api_key,
        &account_id_clone,
        app_handle,
        db_mutex,
        state.cli_process.clone(),
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn stop_stripe_cli(state: State<'_, AppState>) -> Result<(), AppError> {
    let child = {
        let mut cli = state.cli_process.lock().unwrap();
        cli.take()
    };
    if let Some(mut child) = child {
        let _ = child.kill().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_stripe_cli_status(state: State<'_, AppState>) -> Result<bool, AppError> {
    let cli = state.cli_process.lock().unwrap();
    Ok(cli.is_some())
}
