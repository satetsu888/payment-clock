use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_products(api_key: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client.get_list("/v1/products?active=true&limit=100").await
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
    client.get_list(&path).await
}
