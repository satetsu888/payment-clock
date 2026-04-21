use crate::error::AppError;
use crate::stripe::client::StripeClient;

pub async fn list_tax_rates(api_key: &str) -> Result<Vec<serde_json::Value>, AppError> {
    let client = StripeClient::new(api_key);
    client
        .get_all_list("/v1/tax_rates", &[("active", "true")])
        .await
}

pub async fn create_tax_rate(
    api_key: &str,
    display_name: &str,
    percentage: &str,
    inclusive: bool,
    country: Option<&str>,
    state: Option<&str>,
    jurisdiction: Option<&str>,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let inclusive_str = if inclusive { "true" } else { "false" };
    let mut params: Vec<(&str, &str)> = vec![
        ("display_name", display_name),
        ("percentage", percentage),
        ("inclusive", inclusive_str),
    ];
    if let Some(c) = country {
        if !c.is_empty() {
            params.push(("country", c));
        }
    }
    if let Some(s) = state {
        if !s.is_empty() {
            params.push(("state", s));
        }
    }
    if let Some(j) = jurisdiction {
        if !j.is_empty() {
            params.push(("jurisdiction", j));
        }
    }
    client.post("/v1/tax_rates", &params).await
}

pub async fn archive_tax_rate(
    api_key: &str,
    tax_rate_id: &str,
) -> Result<serde_json::Value, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/tax_rates/{}", tax_rate_id);
    client.post(&path, &[("active", "false")]).await
}
