use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn create_customer(
    api_key: &str,
    test_clock_id: &str,
    name: Option<&str>,
    email: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let mut params: Vec<(&str, &str)> = vec![("test_clock", test_clock_id)];
    if let Some(n) = name {
        params.push(("name", n));
    }
    if let Some(e) = email {
        params.push(("email", e));
    }
    client.post("/v1/customers", &params).await
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
    let path = format!(
        "/v1/customers?test_clock={}&limit=100",
        test_clock_id
    );
    client.get_list(&path).await
}
