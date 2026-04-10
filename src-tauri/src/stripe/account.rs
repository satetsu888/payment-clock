use serde::Deserialize;

use crate::error::AppError;
use crate::stripe::client::StripeClient;

#[derive(Debug, Deserialize)]
pub struct StripeAccount {
    pub id: String,
    pub business_profile: Option<BusinessProfile>,
    pub settings: Option<AccountSettings>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BusinessProfile {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountSettings {
    pub dashboard: Option<DashboardSettings>,
}

#[derive(Debug, Deserialize)]
pub struct DashboardSettings {
    pub display_name: Option<String>,
}

impl StripeAccount {
    /// Returns the best available display name for this account.
    pub fn display_name(&self) -> Option<String> {
        // Prefer business_profile.name, then dashboard display_name, then email
        self.business_profile
            .as_ref()
            .and_then(|bp| bp.name.clone())
            .or_else(|| {
                self.settings
                    .as_ref()
                    .and_then(|s| s.dashboard.as_ref())
                    .and_then(|d| d.display_name.clone())
            })
            .or_else(|| self.email.clone())
    }
}

pub struct FetchAccountResult {
    pub account: StripeAccount,
    pub api_version: Option<String>,
}

pub async fn fetch_account(api_key: &str) -> Result<FetchAccountResult, AppError> {
    let client = StripeClient::new(api_key);
    let resp = client.get_with_version("/v1/account").await?;
    let account: StripeAccount = serde_json::from_value(resp.body)?;
    Ok(FetchAccountResult {
        account,
        api_version: resp.api_version,
    })
}
