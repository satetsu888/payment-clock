use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_products(api_key: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let resp = client.get("/v1/products?active=true&limit=100").await?;
    let data = resp["data"]
        .as_array()
        .ok_or_else(|| AppError::Stripe("Invalid response format".to_string()))?;
    Ok(data.clone())
}

pub async fn list_prices(
    api_key: &str,
    product_id: Option<&str>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let path = match product_id {
        Some(pid) => format!("/v1/prices?active=true&limit=100&product={}", pid),
        None => "/v1/prices?active=true&limit=100".to_string(),
    };
    let resp = client.get(&path).await?;
    let data = resp["data"]
        .as_array()
        .ok_or_else(|| AppError::Stripe("Invalid response format".to_string()))?;
    Ok(data.clone())
}
