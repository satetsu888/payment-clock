use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::models::{account, operation, resource_snapshot, test_clock};
use crate::state::AppState;
use crate::stripe;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceItem {
    pub stripe_id: String,
    pub resource_type: String,
    pub data: serde_json::Value,
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
    let (api_key, stripe_clock_id) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let clock = test_clock::get_by_id(&db, &test_clock_id)?;
        (api_key, clock.stripe_test_clock_id)
    };

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
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };

    let updated_customer =
        stripe::customer::attach_payment_method(&api_key, &customer_id, &payment_method_id)
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
        "attach_payment_method",
        Some(&params_json),
        Some(&customer_id),
        &now,
    )?;
    Ok(updated_customer)
}

#[tauri::command]
pub async fn create_subscription(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
    customer_id: String,
    price_id: String,
) -> Result<serde_json::Value, AppError> {
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };

    let subscription =
        stripe::subscription::create_subscription(&api_key, &customer_id, &price_id).await?;

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
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };
    stripe::product::list_products(&api_key).await
}

#[tauri::command]
pub async fn list_prices(
    state: State<'_, AppState>,
    account_id: String,
    product_id: Option<String>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let api_key = {
        let db = state.db.lock().unwrap();
        account::get_api_key(&db, &account_id)?
    };
    stripe::product::list_prices(&api_key, product_id.as_deref()).await
}

#[tauri::command]
pub async fn fetch_test_clock_resources(
    state: State<'_, AppState>,
    account_id: String,
    test_clock_id: String,
) -> Result<TestClockResources, AppError> {
    let (api_key, stripe_clock_id) = {
        let db = state.db.lock().unwrap();
        let api_key = account::get_api_key(&db, &account_id)?;
        let clock = test_clock::get_by_id(&db, &test_clock_id)?;
        (api_key, clock.stripe_test_clock_id)
    };

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
        for c in &customers {
            let id = c["id"].as_str().unwrap_or_default();
            resource_snapshot::save_snapshot(
                &db,
                &account_id,
                Some(&test_clock_id),
                "customer",
                id,
                &c.to_string(),
                &now,
            )?;
        }
        for s in &all_subscriptions {
            let id = s["id"].as_str().unwrap_or_default();
            resource_snapshot::save_snapshot(
                &db,
                &account_id,
                Some(&test_clock_id),
                "subscription",
                id,
                &s.to_string(),
                &now,
            )?;
        }
        for i in &all_invoices {
            let id = i["id"].as_str().unwrap_or_default();
            resource_snapshot::save_snapshot(
                &db,
                &account_id,
                Some(&test_clock_id),
                "invoice",
                id,
                &i.to_string(),
                &now,
            )?;
        }
        for p in &all_payment_intents {
            let id = p["id"].as_str().unwrap_or_default();
            resource_snapshot::save_snapshot(
                &db,
                &account_id,
                Some(&test_clock_id),
                "payment_intent",
                id,
                &p.to_string(),
                &now,
            )?;
        }
    }

    // Build response
    let to_items = |items: &[serde_json::Value], rtype: &str| -> Vec<ResourceItem> {
        items
            .iter()
            .map(|v| ResourceItem {
                stripe_id: v["id"].as_str().unwrap_or_default().to_string(),
                resource_type: rtype.to_string(),
                data: v.clone(),
            })
            .collect()
    };

    Ok(TestClockResources {
        customers: to_items(&customers, "customer"),
        subscriptions: to_items(&all_subscriptions, "subscription"),
        invoices: to_items(&all_invoices, "invoice"),
        payment_intents: to_items(&all_payment_intents, "payment_intent"),
    })
}
