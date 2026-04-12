use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn create_customer(
    api_key: &str,
    test_clock_id: &str,
    name: Option<&str>,
    email: Option<&str>,
    metadata: Option<&std::collections::HashMap<String, String>>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(String, String)> = vec![("test_clock".into(), test_clock_id.to_string())];
    if let Some(n) = name {
        params.push(("name".into(), n.to_string()));
    }
    if let Some(e) = email {
        params.push(("email".into(), e.to_string()));
    }
    if let Some(meta) = metadata {
        for (key, value) in meta {
            params.push((format!("metadata[{}]", key), value.clone()));
        }
    }
    let str_params: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    client.post("/v1/customers", &str_params).await
}

pub async fn set_default_payment_method(
    api_key: &str,
    customer_id: &str,
    payment_method_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let params = [(
        "invoice_settings[default_payment_method]",
        payment_method_id,
    )];
    let path = format!("/v1/customers/{}", customer_id);
    client.post(&path, &params).await
}

pub async fn list_customers_by_test_clock(
    api_key: &str,
    test_clock_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list("/v1/customers", &[("test_clock", test_clock_id)])
        .await
}
