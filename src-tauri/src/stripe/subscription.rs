use crate::error::AppError;
use crate::stripe::client::StripeClient;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct BillingCycleAnchorConfig {
    pub day_of_month: u32,
    pub month: Option<u32>,
    pub hour: Option<u32>,
    pub minute: Option<u32>,
    pub second: Option<u32>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct SubscriptionItemInput {
    pub price: String,
    #[serde(default)]
    pub tax_rates: Vec<String>,
}

pub async fn create_subscription(
    api_key: &str,
    customer_id: &str,
    items: &[SubscriptionItemInput],
    trial_period_days: Option<u32>,
    trial_end: Option<i64>,
    trial_end_behavior: Option<&str>,
    billing_cycle_anchor: Option<i64>,
    billing_cycle_anchor_config: Option<BillingCycleAnchorConfig>,
    proration_behavior: Option<&str>,
    automatic_tax_enabled: Option<bool>,
    metadata: Option<&std::collections::HashMap<String, String>>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = vec![
        ("customer".into(), customer_id.to_string()),
    ];
    for (i, item) in items.iter().enumerate() {
        params.push((format!("items[{}][price]", i), item.price.clone()));
        for (j, tax_rate_id) in item.tax_rates.iter().enumerate() {
            params.push((format!("items[{}][tax_rates][{}]", i, j), tax_rate_id.clone()));
        }
    }
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
    if let Some(anchor) = billing_cycle_anchor {
        params.push(("billing_cycle_anchor".into(), anchor.to_string()));
    } else if let Some(ref config) = billing_cycle_anchor_config {
        params.push(("billing_cycle_anchor_config[day_of_month]".into(), config.day_of_month.to_string()));
        if let Some(month) = config.month {
            params.push(("billing_cycle_anchor_config[month]".into(), month.to_string()));
        }
        if let Some(hour) = config.hour {
            params.push(("billing_cycle_anchor_config[hour]".into(), hour.to_string()));
        }
        if let Some(minute) = config.minute {
            params.push(("billing_cycle_anchor_config[minute]".into(), minute.to_string()));
        }
        if let Some(second) = config.second {
            params.push(("billing_cycle_anchor_config[second]".into(), second.to_string()));
        }
    }
    if let Some(pb) = proration_behavior {
        params.push(("proration_behavior".into(), pb.to_string()));
    }
    if let Some(enabled) = automatic_tax_enabled {
        params.push((
            "automatic_tax[enabled]".into(),
            if enabled { "true".into() } else { "false".into() },
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

/// Update subscription items (add, change, or remove items).
/// Each item in `items` should be a map with keys like "id", "price", "deleted".
pub async fn update_subscription_items(
    api_key: &str,
    subscription_id: &str,
    items: &[std::collections::HashMap<String, String>],
    proration_behavior: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = Vec::new();
    for (i, item) in items.iter().enumerate() {
        for (key, value) in item {
            params.push((format!("items[{}][{}]", i, key), value.clone()));
        }
    }
    if let Some(behavior) = proration_behavior {
        params.push(("proration_behavior".into(), behavior.to_string()));
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &str_params,
        )
        .await
}

/// Update trial end on an existing subscription.
/// `trial_end` can be a Unix timestamp or "now".
pub async fn update_subscription_trial(
    api_key: &str,
    subscription_id: &str,
    trial_end: &str,
    trial_end_behavior: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = vec![
        ("trial_end".into(), trial_end.to_string()),
    ];
    if let Some(behavior) = trial_end_behavior {
        params.push((
            "trial_settings[end_behavior][missing_payment_method]".into(),
            behavior.to_string(),
        ));
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &str_params,
        )
        .await
}

/// Cancel a subscription immediately (DELETE).
pub async fn cancel_subscription_immediately(
    api_key: &str,
    subscription_id: &str,
    invoice_now: bool,
    prorate: bool,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let invoice_now_str = if invoice_now { "true" } else { "false" };
    let prorate_str = if prorate { "true" } else { "false" };
    client
        .delete_with_params(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[
                ("invoice_now", invoice_now_str),
                ("prorate", prorate_str),
            ],
        )
        .await
}

/// Set cancel_at to a specific timestamp.
pub async fn update_subscription_cancel_at(
    api_key: &str,
    subscription_id: &str,
    cancel_at: i64,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let cancel_at_str = cancel_at.to_string();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[("cancel_at", cancel_at_str.as_str())],
        )
        .await
}

/// Undo cancel_at_period_end.
pub async fn undo_cancel_subscription(
    api_key: &str,
    subscription_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &[("cancel_at_period_end", "false")],
        )
        .await
}

/// Update billing_cycle_anchor.
pub async fn update_subscription_billing_anchor(
    api_key: &str,
    subscription_id: &str,
    billing_cycle_anchor: &str,
    proration_behavior: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = vec![
        ("billing_cycle_anchor".into(), billing_cycle_anchor.to_string()),
    ];
    if let Some(behavior) = proration_behavior {
        params.push(("proration_behavior".into(), behavior.to_string()));
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &str_params,
        )
        .await
}

/// Pause subscription with behavior and optional resumes_at.
pub async fn pause_subscription_with_options(
    api_key: &str,
    subscription_id: &str,
    behavior: &str,
    resumes_at: Option<i64>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = vec![
        ("pause_collection[behavior]".into(), behavior.to_string()),
    ];
    if let Some(ts) = resumes_at {
        params.push(("pause_collection[resumes_at]".into(), ts.to_string()));
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &str_params,
        )
        .await
}

/// Apply a discount (coupon or promotion code) to a subscription.
pub async fn apply_subscription_discount(
    api_key: &str,
    subscription_id: &str,
    coupon_id: Option<&str>,
    promotion_code_id: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = Vec::new();
    if let Some(coupon) = coupon_id {
        params.push(("coupon".into(), coupon.to_string()));
    }
    if let Some(promo) = promotion_code_id {
        params.push(("promotion_code".into(), promo.to_string()));
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client
        .post(
            &format!("/v1/subscriptions/{}", subscription_id),
            &str_params,
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
