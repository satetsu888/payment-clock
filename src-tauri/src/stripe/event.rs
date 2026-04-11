use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn fetch_events(
    api_key: &str,
    created_after: Option<i64>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let ts_str;
    let mut params: Vec<(&str, &str)> = Vec::new();
    if let Some(ts) = created_after {
        ts_str = ts.to_string();
        params.push(("created[gt]", &ts_str));
    }
    client.get_all_list("/v1/events", &params).await
}

/// Extract the test_clock stripe ID from an event's data.object
pub fn extract_test_clock_id(event: &serde_json::Value) -> Option<String> {
    // Try data.object.test_clock (string ID)
    if let Some(tc) = event["data"]["object"]["test_clock"].as_str() {
        return Some(tc.to_string());
    }
    // Some events have nested objects; try the customer's test_clock
    if let Some(tc) = event["data"]["object"]["customer_details"]["test_clock"].as_str() {
        return Some(tc.to_string());
    }
    None
}
