use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::models::{account, operation, resource_snapshot, test_clock};
use crate::stripe::compat;
use crate::state::AppState;
use crate::stripe;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestClockDetail {
    pub test_clock: test_clock::TestClock,
    pub operations: Vec<operation::Operation>,
}

#[tauri::command]
pub async fn list_test_clocks(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<Vec<test_clock::TestClock>, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    // Step 2: Fetch from Stripe API
    let stripe_clocks = stripe::test_clock::list_test_clocks(&api_key).await?;

    // Step 3: Sync to DB and return all (including deleted)
    {
        let db = state.db.lock().unwrap();
        for sc in &stripe_clocks {
            test_clock::upsert_from_stripe(&db, &account_id, sc)?;
        }
        test_clock::list_by_account(&db, &account_id)
    }
}

#[tauri::command]
pub async fn create_test_clock(
    state: State<'_, AppState>,
    account_id: String,
    frozen_time: i64,
    name: Option<String>,
) -> Result<test_clock::TestClock, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    let stripe_clock =
        stripe::test_clock::create_test_clock(&api_key, frozen_time, name.as_deref()).await?;

    let db = state.db.lock().unwrap();
    let local_id = test_clock::upsert_from_stripe(&db, &account_id, &stripe_clock)?;
    let now = chrono::Utc::now().to_rfc3339();
    let params_json = serde_json::json!({
        "frozen_time": frozen_time,
        "name": name,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&local_id),
        "create_clock",
        Some(&params_json),
        Some(&stripe_clock.id),
        &now,
    )?;
    test_clock::get_by_id(&db, &local_id)
}

#[tauri::command]
pub async fn advance_test_clock(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    frozen_time: i64,
) -> Result<test_clock::TestClock, AppError> {
    let (api_key, stripe_clock_id) = state.get_api_key_and_clock(&account_id, &test_clock_id)?;

    let stripe_clock =
        stripe::test_clock::advance_test_clock(&api_key, &stripe_clock_id, frozen_time).await?;

    let db = state.db.lock().unwrap();
    test_clock::upsert_from_stripe(&db, &account_id, &stripe_clock)?;
    let now = chrono::Utc::now().to_rfc3339();
    let params_json = serde_json::json!({
        "frozen_time": frozen_time,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "advance_time",
        Some(&params_json),
        None,
        &now,
    )?;
    test_clock::get_by_id(&db, &test_clock_id)
}

#[tauri::command]
pub async fn delete_test_clock(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
) -> Result<(), AppError> {
    let (api_key, stripe_clock_id) = state.get_api_key_and_clock(&account_id, &test_clock_id)?;

    stripe::test_clock::delete_test_clock(&api_key, &stripe_clock_id).await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    test_clock::mark_deleted(&db, &test_clock_id, &now)?;
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "delete_clock",
        None,
        None,
        &now,
    )?;
    Ok(())
}

#[tauri::command]
pub async fn purge_test_clock(
    state: State<'_, AppState>,
    test_clock_id: String,
) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    let clock = test_clock::get_by_id(&db, &test_clock_id)?;
    if clock.deleted_at.is_none() {
        return Err(AppError::Validation(
            "Only deleted test clocks can be purged".to_string(),
        ));
    }
    test_clock::purge(&db, &test_clock_id)?;
    Ok(())
}

#[tauri::command]
pub async fn get_test_clock_detail(
    state: State<'_, AppState>,
    test_clock_id: String,
) -> Result<TestClockDetail, AppError> {
    let db = state.db.lock().unwrap();
    let clock = test_clock::get_by_id(&db, &test_clock_id)?;
    let operations = operation::list_by_test_clock(&db, &test_clock_id)?;
    Ok(TestClockDetail {
        test_clock: clock,
        operations,
    })
}

#[tauri::command]
pub async fn refresh_test_clock(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
) -> Result<test_clock::TestClock, AppError> {
    let (api_key, stripe_clock_id) = state.get_api_key_and_clock(&account_id, &test_clock_id)?;

    let stripe_clock = stripe::test_clock::get_test_clock(&api_key, &stripe_clock_id).await?;

    let db = state.db.lock().unwrap();
    test_clock::upsert_from_stripe(&db, &account_id, &stripe_clock)?;
    test_clock::get_by_id(&db, &test_clock_id)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancePreviewItem {
    pub stripe_id: String,
    pub resource_type: String,
    pub description: String,
    pub trigger_time: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancePreview {
    pub affected_subscriptions: Vec<AdvancePreviewItem>,
    pub affected_invoices: Vec<AdvancePreviewItem>,
}

#[tauri::command]
pub async fn preview_advance(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    frozen_time: i64,
) -> Result<AdvancePreview, AppError> {
    let db = state.db.lock().unwrap();

    let api_version = account::get_api_version(&db, &account_id)?
        .unwrap_or_default();

    let mut affected_subscriptions = Vec::new();
    let mut affected_invoices = Vec::new();

    // Check subscriptions — show all with period_end info, mark those that will renew
    let sub_snapshots =
        resource_snapshot::list_latest_by_resource(&db, &test_clock_id, "subscription")?;
    for snap in sub_snapshots {
        let data: serde_json::Value = serde_json::from_str(&snap.data)?;
        let status = data["status"].as_str().unwrap_or("");
        if status != "active" && status != "trialing" {
            continue;
        }
        let period_end = compat::subscription_current_period_end(&data, &api_version);
        if let Some(period_end) = period_end {
            let will_renew = period_end <= frozen_time;
            let desc = if will_renew {
                format!(
                    "Will renew (period ends {})",
                    chrono::DateTime::from_timestamp(period_end, 0)
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_default()
                )
            } else {
                format!(
                    "Period ends {} (not reached)",
                    chrono::DateTime::from_timestamp(period_end, 0)
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_default()
                )
            };
            affected_subscriptions.push(AdvancePreviewItem {
                stripe_id: snap.stripe_resource_id,
                resource_type: "subscription".to_string(),
                description: desc,
                trigger_time: chrono::DateTime::from_timestamp(period_end, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default(),
            });
        }
    }

    // Check invoices — open/draft ones that will be affected
    let inv_snapshots =
        resource_snapshot::list_latest_by_resource(&db, &test_clock_id, "invoice")?;
    for snap in inv_snapshots {
        let data: serde_json::Value = serde_json::from_str(&snap.data)?;
        let status = data["status"].as_str().unwrap_or("");
        if status != "open" && status != "draft" {
            continue;
        }
        // Use due_date or period_end as trigger time
        let trigger = data["due_date"]
            .as_i64()
            .or_else(|| data["period_end"].as_i64());
        let desc = match trigger {
            Some(ts) if ts <= frozen_time => format!(
                "Due {} (will be processed)",
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                    .unwrap_or_default()
            ),
            Some(ts) => format!(
                "Due {} (not reached)",
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                    .unwrap_or_default()
            ),
            None => format!("Status: {} (no due date)", status),
        };
        affected_invoices.push(AdvancePreviewItem {
            stripe_id: snap.stripe_resource_id,
            resource_type: "invoice".to_string(),
            description: desc,
            trigger_time: trigger
                .and_then(|ts| chrono::DateTime::from_timestamp(ts, 0))
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        });
    }

    Ok(AdvancePreview {
        affected_subscriptions,
        affected_invoices,
    })
}
