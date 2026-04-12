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
    let mut params: Vec<(String, String)> = vec![
        ("customer".into(), customer_id.to_string()),
        ("items[0][price]".into(), price_id.to_string()),
    ];
    if let Some(days) = trial_period_days {
        params.push(("trial_period_days".into(), days.to_string()));
    }
    if let Some(end) = trial_end {
        params.push(("trial_end".into(), end.to_string()));
    }
    if let Some(behavior) = trial_end_behavior {
        params.push((
            "trial_settings[end_behavior][missing_payment_method]".into(),
            behavior.to_string(),
        ));
    }
    if let Some(meta) = metadata {
        for (key, value) in meta {
            params.push((format!("metadata[{}]", key), value.clone()));
        }
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client.post("/v1/subscriptions", &str_params).await
}

pub async fn cancel_subscription(
    api_key: &str,
    subscription_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[("cancel_at_period_end", "true")],
        )
        .await
}

pub async fn pause_subscription(
    api_key: &str,
    subscription_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[("pause_collection[behavior]", "void")],
        )
        .await
}

pub async fn resume_subscription(
    api_key: &str,
    subscription_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[("pause_collection", "")],
        )
        .await
}

pub async fn list_subscriptions_by_customer(
    api_key: &str,
    customer_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list(
            "/v1/subscriptions",
            &[("customer", customer_id), ("status", "all")],
        )
        .await
}
