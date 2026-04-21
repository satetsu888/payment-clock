use crate::error::AppError;
use crate::stripe::client::StripeClient;
use crate::stripe::compat;

pub async fn list_invoices_by_customer(
    api_key: &str,
    customer_id: &str,
    api_version: Option<&str>,
) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    let expand_tax = if compat::uses_total_taxes_field(api_version) {
        "data.total_taxes.tax_rate_details.tax_rate"
    } else {
        "data.total_tax_amounts.tax_rate"
    };
    client
        .get_all_list(
            "/v1/invoices",
            &[
                ("customer", customer_id),
                ("expand[]", expand_tax),
            ],
        )
        .await
}
