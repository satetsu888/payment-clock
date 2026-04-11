use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::models::{operation, resource_snapshot};
use crate::state::AppState;
use crate::stripe;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceItem {
    pub stripe_id: String,
    pub resource_type: String,
    pub data: serde_json::Value,
    pub previous_status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestClockResources {
    pub customers: Vec<ResourceItem>,
    pub subscriptions: Vec<ResourceItem>,
    pub invoices: Vec<ResourceItem>,
    pub payment_intents: Vec<ResourceItem>,
}

#[tauri::command]
pub async fn create_customer(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    name: Option<String>,
    email: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let (api_key, stripe_clock_id) = state.get_api_key_and_clock(&account_id, &test_clock_id)?;

    let customer = stripe::customer::create_customer(
        &api_key,
        &stripe_clock_id,
        name.as_deref(),
        email.as_deref(),
    )
    .await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let customer_id = customer["id"].as_str().unwrap_or_default();
    resource_snapshot::save_snapshot(
        &db,
        &account_id,
        Some(&test_clock_id),
        "customer",
        customer_id,
        &customer.to_string(),
        &now,
    )?;
    let params_json = serde_json::json!({
        "name": name,
        "email": email,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "create_customer",
        Some(&params_json),
        Some(customer_id),
        &now,
    )?;
    Ok(customer)
}

#[tauri::command]
pub async fn attach_payment_method(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    customer_id: String,
    payment_method_id: String,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    // Attach the payment method
    let attached_pm =
        stripe::payment_method::attach_payment_method(&api_key, &payment_method_id, &customer_id)
            .await?;

    let actual_pm_id = attached_pm["id"]
        .as_str()
        .ok_or_else(|| AppError::Stripe("Missing payment method ID in response".to_string()))?
        .to_string();

    // Check if this is the first payment method — if so, set as default
    let existing_pms =
        stripe::payment_method::list_payment_methods(&api_key, &customer_id).await?;
    let updated_customer = if existing_pms.len() == 1 {
        // First PM — auto-set as default
        stripe::customer::set_default_payment_method(&api_key, &customer_id, &actual_pm_id).await?
    } else {
        // Not the first — just return current customer state
        serde_json::json!({ "id": customer_id })
    };

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    // Save payment method snapshot
    resource_snapshot::save_snapshot(
        &db,
        &account_id,
        Some(&test_clock_id),
        "payment_method",
        &actual_pm_id,
        &attached_pm.to_string(),
        &now,
    )?;
    // Save updated customer snapshot if default was set
    if existing_pms.len() == 1 {
        resource_snapshot::save_snapshot(
            &db,
            &account_id,
            Some(&test_clock_id),
            "customer",
            &customer_id,
            &updated_customer.to_string(),
            &now,
        )?;
    }
    let params_json = serde_json::json!({
        "customer_id": customer_id,
        "payment_method_id": payment_method_id,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "attach_payment_method",
        Some(&params_json),
        Some(&customer_id),
        &now,
    )?;
    Ok(attached_pm)
}

#[tauri::command]
pub async fn set_default_payment_method(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    customer_id: String,
    payment_method_id: String,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    let updated_customer =
        stripe::customer::set_default_payment_method(&api_key, &customer_id, &payment_method_id)
            .await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    resource_snapshot::save_snapshot(
        &db,
        &account_id,
        Some(&test_clock_id),
        "customer",
        &customer_id,
        &updated_customer.to_string(),
        &now,
    )?;
    let params_json = serde_json::json!({
        "customer_id": customer_id,
        "payment_method_id": payment_method_id,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "set_default_payment_method",
        Some(&params_json),
        Some(&customer_id),
        &now,
    )?;
    Ok(updated_customer)
}

#[tauri::command]
pub async fn list_payment_methods(
    state: State<'_, AppState>,
    account_id: String,
    customer_id: String,
) -> Result<Vec<serde_json::Value>, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    stripe::payment_method::list_payment_methods(&api_key, &customer_id).await
}

#[tauri::command]
pub async fn detach_payment_method(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    customer_id: String,
    payment_method_id: String,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    let detached_pm =
        stripe::payment_method::detach_payment_method(&api_key, &payment_method_id).await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let params_json = serde_json::json!({
        "customer_id": customer_id,
        "payment_method_id": payment_method_id,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "detach_payment_method",
        Some(&params_json),
        Some(&customer_id),
        &now,
    )?;
    Ok(detached_pm)
}

#[tauri::command]
pub async fn create_subscription(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    customer_id: String,
    price_id: String,
    trial_period_days: Option<u32>,
    trial_end: Option<i64>,
    trial_end_behavior: Option<String>,
    metadata: Option<std::collections::HashMap<String, String>>,
) -> Result<serde_json::Value, AppError> {
    let api_key = state.get_api_key(&account_id)?;

    let subscription = stripe::subscription::create_subscription(
        &api_key,
        &customer_id,
        &price_id,
        trial_period_days,
        trial_end,
        trial_end_behavior.as_deref(),
        metadata.as_ref(),
    )
    .await?;

    let db = state.db.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let sub_id = subscription["id"].as_str().unwrap_or_default();
    resource_snapshot::save_snapshot(
        &db,
        &account_id,
        Some(&test_clock_id),
        "subscription",
        sub_id,
        &subscription.to_string(),
        &now,
    )?;
    let params_json = serde_json::json!({
        "customer_id": customer_id,
        "price_id": price_id,
        "trial_period_days": trial_period_days,
        "trial_end": trial_end,
        "trial_end_behavior": trial_end_behavior,
    })
    .to_string();
    operation::record(
        &db,
        &account_id,
        Some(&test_clock_id),
        "create_subscription",
        Some(&params_json),
        Some(sub_id),
        &now,
    )?;
    Ok(subscription)
}

#[tauri::command]
pub async fn list_products(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<Vec<serde_json::Value>, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    stripe::product::list_products(&api_key).await
}

#[tauri::command]
pub async fn list_prices(
    state: State<'_, AppState>,
    account_id: String,
    product_id: Option<String>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let api_key = state.get_api_key(&account_id)?;
    stripe::product::list_prices(&api_key, product_id.as_deref()).await
}

#[tauri::command]
pub async fn fetch_test_clock_resources(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
) -> Result<TestClockResources, AppError> {
    let (api_key, stripe_clock_id) = state.get_api_key_and_clock(&account_id, &test_clock_id)?;

    // Fetch customers for this test clock
    let customers =
        stripe::customer::list_customers_by_test_clock(&api_key, &stripe_clock_id).await?;

    // For each customer, fetch subscriptions, invoices, payment intents
    let mut all_subscriptions = Vec::new();
    let mut all_invoices = Vec::new();
    let mut all_payment_intents = Vec::new();

    for customer in &customers {
        let cust_id = customer["id"].as_str().unwrap_or_default();
        if cust_id.is_empty() {
            continue;
        }

        let subs =
            stripe::subscription::list_subscriptions_by_customer(&api_key, cust_id).await?;
        all_subscriptions.extend(subs);

        let invoices =
            stripe::invoice::list_invoices_by_customer(&api_key, cust_id).await?;
        all_invoices.extend(invoices);

        let pis =
            stripe::payment_intent::list_payment_intents_by_customer(&api_key, cust_id).await?;
        all_payment_intents.extend(pis);
    }

    // Save snapshots
    {
        let db = state.db.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let resource_groups: &[(&[serde_json::Value], &str)] = &[
            (&customers, "customer"),
            (&all_subscriptions, "subscription"),
            (&all_invoices, "invoice"),
            (&all_payment_intents, "payment_intent"),
        ];
        for (items, resource_type) in resource_groups {
            for item in *items {
                let id = item["id"].as_str().unwrap_or_default();
                resource_snapshot::save_snapshot(
                    &db,
                    &account_id,
                    Some(&test_clock_id),
                    resource_type,
                    id,
                    &item.to_string(),
                    &now,
                )?;
            }
        }
    }

    // Build response with previous_status lookup
    let build_items = |db: &rusqlite::Connection,
                       items: &[serde_json::Value],
                       rtype: &str,
                       tc_id: &str|
     -> Vec<ResourceItem> {
        items
            .iter()
            .map(|v| {
                let sid = v["id"].as_str().unwrap_or_default();
                let prev = resource_snapshot::get_previous_status(db, tc_id, rtype, sid)
                    .ok()
                    .flatten();
                ResourceItem {
                    stripe_id: sid.to_string(),
                    resource_type: rtype.to_string(),
                    data: v.clone(),
                    previous_status: prev,
                }
            })
            .collect()
    };

    let db = state.db.lock().unwrap();
    Ok(TestClockResources {
        customers: build_items(&db, &customers, "customer", &test_clock_id),
        subscriptions: build_items(&db, &all_subscriptions, "subscription", &test_clock_id),
        invoices: build_items(&db, &all_invoices, "invoice", &test_clock_id),
        payment_intents: build_items(&db, &all_payment_intents, "payment_intent", &test_clock_id),
    })
}
