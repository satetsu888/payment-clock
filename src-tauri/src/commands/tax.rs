use tauri::State;

use crate::error::AppError;
use crate::models::operation;
use crate::state::AppState;
use crate::stripe;

#[tauri::command]
pub async fn list_tax_rates(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<Vec<serde_json::Value>, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    stripe::tax_rate::list_tax_rates(&api_key).await
}

#[tauri::command]
pub async fn create_tax_rate(
    state: State<'_, AppState>,
    account_id: String,
    display_name: String,
    percentage: String,
    inclusive: bool,
    country: Option<String>,
    state_code: Option<String>,
    jurisdiction: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    let tax_rate = stripe::tax_rate::create_tax_rate(
        &api_key,
        &display_name,
        &percentage,
        inclusive,
        country.as_deref(),
        state_code.as_deref(),
        jurisdiction.as_deref(),
    )
    .await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let tax_rate_id = tax_rate["id"].as_str().unwrap_or_default();
    let params_json = serde_json::json!({
        "display_name": display_name,
        "percentage": percentage,
        "inclusive": inclusive,
        "country": country,
        "state": state_code,
        "jurisdiction": jurisdiction,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        None,
        "create_tax_rate",
        Some(&params_json),
        Some(tax_rate_id),
        &now,
    )?;
    Ok(tax_rate)
}

#[tauri::command]
pub async fn archive_tax_rate(
    state: State<'_, AppState>,
    account_id: String,
    tax_rate_id: String,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    let tax_rate = stripe::tax_rate::archive_tax_rate(&api_key, &tax_rate_id).await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    operation::record(
        &db,
        &account_id,
        None,
        "archive_tax_rate",
        Some(&serde_json::json!({ "tax_rate_id": tax_rate_id }).to_string()),
        Some(&tax_rate_id),
        &now,
    )?;
    Ok(tax_rate)
}
