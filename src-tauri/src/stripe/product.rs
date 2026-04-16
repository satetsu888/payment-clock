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

pub async fn create_product(
    api_key: &str,
    name: &str,
    description: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(&str, &str)> = vec![("name", name)];
    if let Some(desc) = description {
        params.push(("description", desc));
    }
    client.post("/v1/products", &params).await
}

pub async fn archive_product(
    api_key: &str,
    product_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/products/{}", product_id);
    client.post(&path, &[("active", "false")]).await
}

pub async fn create_price(
    api_key: &str,
    product_id: &str,
    unit_amount: i64,
    currency: &str,
    recurring_interval: Option<&str>,
    recurring_interval_count: Option<u32>,
    nickname: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let amount_str = unit_amount.to_string();
    let interval_count_str;
    let mut params: Vec<(&str, &str)> = vec![
        ("product", product_id),
        ("unit_amount", &amount_str),
        ("currency", currency),
    ];
    if let Some(interval) = recurring_interval {
        params.push(("recurring[interval]", interval));
        if let Some(count) = recurring_interval_count {
            interval_count_str = count.to_string();
            params.push(("recurring[interval_count]", &interval_count_str));
        }
    }
    if let Some(nick) = nickname {
        params.push(("nickname", nick));
    }
    client.post("/v1/prices", &params).await
}

pub async fn archive_price(
    api_key: &str,
    price_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/prices/{}", price_id);
    client.post(&path, &[("active", "false")]).await
}
