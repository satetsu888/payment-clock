use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_meters(api_key: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list("/v1/billing/meters", &[("status", "active")])
        .await
}

pub async fn create_meter(
    api_key: &str,
    display_name: &str,
    event_name: &str,
    aggregation_formula: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let params: Vec<(&str, &str)> = vec![
        ("display_name", display_name),
        ("event_name", event_name),
        ("default_aggregation[formula]", aggregation_formula),
    ];
    client.post("/v1/billing/meters", &params).await
}

pub async fn create_meter_event(
    api_key: &str,
    event_name: &str,
    customer_id: &str,
    value: &str,
    timestamp: Option<i64>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let timestamp_str;
    let mut params: Vec<(&str, &str)> = vec![
        ("event_name", event_name),
        ("payload[stripe_customer_id]", customer_id),
        ("payload[value]", value),
    ];
    if let Some(ts) = timestamp {
        timestamp_str = ts.to_string();
        params.push(("timestamp", &timestamp_str));
    }
    client.post("/v1/billing/meter_events", &params).await
}
