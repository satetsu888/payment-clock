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

pub async fn attach_payment_method(
    api_key: &str,
    customer_id: &str,
    payment_method_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    // Attach the payment method to the customer (returns the newly created PM)
    let path = format!("/v1/payment_methods/{}/attach", payment_method_id);
    let params = [("customer", customer_id)];
    let attached_pm = client.post(&path, &params).await?;

    // Use the actual PM ID returned by Stripe (may differ from the input token)
    let actual_pm_id = attached_pm["id"]
        .as_str()
        .ok_or_else(|| AppError::Stripe("Missing payment method ID in response".to_string()))?;

    // Set it as the default payment method for invoices
    let params = [(
        "invoice_settings[default_payment_method]",
        actual_pm_id,
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
    let resp = client.get(&path).await?;
    let data = resp["data"]
        .as_array()
        .ok_or_else(|| AppError::Stripe("Invalid response format".to_string()))?;
    Ok(data.clone())
}
