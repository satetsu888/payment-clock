use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_products(api_key: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list("/v1/products", &[("active", "true")])
        .await
}

pub async fn list_prices(
    api_key: &str,
    product_id: Option<&str>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(&str, &str)> = vec![("active", "true")];
    if let Some(pid) = product_id {
        params.push(("product", pid));
    }
    client.get_all_list("/v1/prices", &params).await
}
