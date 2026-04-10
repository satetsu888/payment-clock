use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn create_subscription(
    api_key: &str,
    customer_id: &str,
    price_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let params = [
        ("customer", customer_id),
        ("items[0][price]", price_id),
    ];
    client.post("/v1/subscriptions", &params).await
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
    let resp = client.get(&path).await?;
    let data = resp["data"]
        .as_array()
        .ok_or_else(|| AppError::Stripe("Invalid response format".to_string()))?;
    Ok(data.clone())
}
