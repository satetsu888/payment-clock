use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_invoices_by_customer(
    api_key: &str,
    customer_id: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list("/v1/invoices", &[("customer", customer_id)])
        .await
}
