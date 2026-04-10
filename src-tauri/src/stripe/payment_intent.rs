use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_payment_intents_by_customer(
    api_key: &str,
    customer_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!(
        "/v1/payment_intents?customer={}&limit=100",
        customer_id
    );
    let resp = client.get(&path).await?;
    let data = resp["data"]
        .as_array()
        .ok_or_else(|| AppError::Stripe("Invalid response format".to_string()))?;
    Ok(data.clone())
}
