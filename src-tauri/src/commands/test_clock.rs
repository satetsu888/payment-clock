use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::models::{account, operation, test_clock};
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
    // Step 1: Get API key from DB
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };

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
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };

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
    let (api_key, stripe_clock_id) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let clock = test_clock::get_by_id(&db, &test_clock_id)?;
        (api_key, clock.stripe_test_clock_id)
    };

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
    let (api_key, stripe_clock_id) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let clock = test_clock::get_by_id(&db, &test_clock_id)?;
        (api_key, clock.stripe_test_clock_id)
    };

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
    let (api_key, stripe_clock_id) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let clock = test_clock::get_by_id(&db, &test_clock_id)?;
        (api_key, clock.stripe_test_clock_id)
    };

    let stripe_clock = stripe::test_clock::get_test_clock(&api_key, &stripe_clock_id).await?;

    let db = state.db.lock().unwrap();
    test_clock::upsert_from_stripe(&db, &account_id, &stripe_clock)?;
    test_clock::get_by_id(&db, &test_clock_id)
}
