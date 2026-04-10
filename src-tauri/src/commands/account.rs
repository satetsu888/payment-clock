use tauri::State;

use crate::error::AppError;
use crate::models::account::{self, Account, AccountSummary};
use crate::state::AppState;
use crate::stripe;

#[tauri::command]
pub async fn validate_and_save_account(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<Account, AppError> {
    if !api_key.starts_with("sk_test_") {
        return Err(AppError::Validation(
            "Only test mode API keys (sk_test_) are accepted".to_string(),
        ));
    }

    let result = stripe::account::fetch_account(&api_key).await?;
    let stripe_account = result.account;
    let api_version = result.api_version;

    let display_name = stripe_account.display_name();

    let db = state.db.lock().unwrap();

    if let Some(existing) = account::find_by_stripe_account_id(&db, &stripe_account.id)? {
        let now = chrono::Utc::now().to_rfc3339();
        account::update_last_used(&db, &existing.id, &now)?;
        if let Some(ver) = &api_version {
            account::update_api_version(&db, &existing.id, ver)?;
        }
        if let Some(name) = &display_name {
            account::update_display_name(&db, &existing.id, name)?;
        }
        return account::get_account(&db, &existing.id);
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    account::insert_account(
        &db,
        &id,
        &stripe_account.id,
        display_name.as_deref(),
        &api_key,
        api_version.as_deref(),
        &now,
    )?;

    account::get_account(&db, &id)
}

#[tauri::command]
pub async fn list_accounts(state: State<'_, AppState>) -> Result<Vec<AccountSummary>, AppError> {
    let db = state.db.lock().unwrap();
    account::list_accounts(&db)
}

#[tauri::command]
pub async fn select_account(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<Account, AppError> {
    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    account::update_last_used(&db, &account_id, &now)?;
    account::get_account(&db, &account_id)
}

#[tauri::command]
pub async fn delete_account(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    account::delete_account(&db, &account_id)
}
