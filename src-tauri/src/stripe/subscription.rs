use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn create_subscription(
    api_key: &str,
    customer_id: &str,
    price_id: &str,
    trial_period_days: Option<u32>,
    trial_end: Option<i64>,
    trial_end_behavior: Option<&str>,
    metadata: Option<&std::collections::HashMap<String, String>>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(&str, String)> = vec![
        ("customer", customer_id.to_string()),
        ("items[0][price]", price_id.to_string()),
    ];
    if let Some(days) = trial_period_days {
        params.push(("trial_period_days", days.to_string()));
    }
    if let Some(end) = trial_end {
        params.push(("trial_end", end.to_string()));
    }
    if let Some(behavior) = trial_end_behavior {
        params.push((
            "trial_settings[end_behavior][missing_payment_method]",
            behavior.to_string(),
        ));
    }
    if let Some(meta) = metadata {
        for (key, value) in meta {
            params.push((
                // leak is fine here — small number of short-lived params
                Box::leak(format!("metadata[{}]", key).into_boxed_str()),
                value.clone(),
            ));
        }
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    client.post("/v1/subscriptions", &str_params).await
}

pub async fn list_subscriptions_by_customer(
    api_key: &str,
    customer_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!(
        "/v1/subscriptions?customer={}&limit=100&status=all",
        customer_id
    );
    client.get_list(&path).await
}
