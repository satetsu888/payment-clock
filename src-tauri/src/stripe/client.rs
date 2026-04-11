use crate::error::AppError;

const STRIPE_BASE_URL: &str = "https://api.stripe.com";

pub struct StripeClient {
    http: reqwest::Client,
    api_key: String,
}

/// Response from a Stripe API call, including the API version used.
pub struct StripeResponse {
    pub body: serde_json::Value,
    pub api_version: Option<String>,
}

impl StripeClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key: api_key.to_string(),
        }
    }

    /// Make a GET request and return body + API version header.
    pub async fn get_with_version(&self, path: &str) -> Result<StripeResponse, AppError> {
        let url = format!("{}{}", STRIPE_BASE_URL, path);
        let resp = self
            .http
            .get(&url)
            .bearer_auth(&self.api_key)
            .header("User-Agent", "PaymentClock/0.1.0")
            .send()
            .await?;

        let api_version = resp
            .headers()
            .get("stripe-version")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        let status = resp.status();
        let body: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let message = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown Stripe error");
            return Err(AppError::Stripe(format!("{}: {}", status, message)));
        }

        Ok(StripeResponse { body, api_version })
    }

    pub async fn get(&self, path: &str) -> Result<serde_json::Value, AppError> {
        let resp = self.get_with_version(path).await?;
        Ok(resp.body)
    }

    pub async fn get_list(&self, path: &str) -> Result<Vec<serde_json::Value>, AppError> {
        let resp = self.get(path).await?;
        resp["data"]
            .as_array()
            .cloned()
            .ok_or_else(|| AppError::Stripe("Invalid response format".into()))
    }

    pub async fn post(
        &self,
        path: &str,
        params: &[(&str, &str)],
    ) -> Result<serde_json::Value, AppError> {
        let url = format!("{}{}", STRIPE_BASE_URL, path);
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.api_key)
            .header("User-Agent", "PaymentClock/0.1.0")
            .form(params)
            .send()
            .await?;

        let status = resp.status();
        let body: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let message = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown Stripe error");
            return Err(AppError::Stripe(format!("{}: {}", status, message)));
        }

        Ok(body)
    }

    pub async fn delete(&self, path: &str) -> Result<serde_json::Value, AppError> {
        let url = format!("{}{}", STRIPE_BASE_URL, path);
        let resp = self
            .http
            .delete(&url)
            .bearer_auth(&self.api_key)
            .header("User-Agent", "PaymentClock/0.1.0")
            .send()
            .await?;

        let status = resp.status();
        let body: serde_json::Value = resp.json().await?;

        if !status.is_success() {
            let message = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown Stripe error");
            return Err(AppError::Stripe(format!("{}: {}", status, message)));
        }

        Ok(body)
    }
}
