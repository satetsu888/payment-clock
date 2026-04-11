use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn attach_payment_method(
    api_key: &str,
    payment_method_id: &str,
    customer_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/payment_methods/{}/attach", payment_method_id);
    let params = [("customer", customer_id)];
    client.post(&path, &params).await
}

pub async fn detach_payment_method(
    api_key: &str,
    payment_method_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/payment_methods/{}/detach", payment_method_id);
    let params: [(&str, &str); 0] = [];
    client.post(&path, &params).await
}

pub async fn list_payment_methods(
    api_key: &str,
    customer_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/customers/{}/payment_methods?limit=100", customer_id);
    client.get_list(&path).await
}
