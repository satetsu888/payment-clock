use tauri::State;

use crate::error::AppError;
use crate::models::event;
use crate::state::AppState;

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
    let api_key = state.get_api_key(&account_id)?;
    let latest_ts = {
        let db = state.db.lock().unwrap();
        event::get_latest_timestamp(&db, &account_id)?
    };

    // Parse latest timestamp to Unix epoch for Stripe API
    let created_after = latest_ts.and_then(|ts| {
        chrono::DateTime::parse_from_rfc3339(&ts)
            .ok()
            .map(|dt| dt.timestamp())
    });

    let events = crate::stripe::event::fetch_events(&api_key, created_after).await?;

    // Save events to DB in a transaction, then read in the same lock
    let mut db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();

    let tx = db.transaction()?;
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
        let stripe_tc_id = crate::stripe::event::extract_test_clock_id(ev);
        let local_tc_id = stripe_tc_id
            .as_deref()
            .and_then(|stc| resolve_test_clock_id(&tx, &account_id, stc));

        event::record_event(
            &tx,
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
    tx.commit()?;

    // Return events for the requested test clock (or all)
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
