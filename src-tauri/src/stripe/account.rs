use serde::Deserialize;

use crate::error::AppError;
use crate::stripe::client::StripeClient;

#[derive(Debug, Deserialize)]
pub struct StripeAccount {
    pub id: String,
    pub business_profile: Option<BusinessProfile>,
}

#[derive(Debug, Deserialize)]
pub struct BusinessProfile {
    pub name: Option<String>,
}

pub async fn fetch_account(api_key: &str) -> Result<StripeAccount, AppError> {
    let client = StripeClient::new(api_key);
    let resp = client.get("/v1/account").await?;
    let account: StripeAccount = serde_json::from_value(resp)?;
    Ok(account)
}
