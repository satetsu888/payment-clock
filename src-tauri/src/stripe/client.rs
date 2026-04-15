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

    /// Fetch all items from a paginated Stripe list endpoint.
    /// Automatically follows `has_more` / `starting_after` up to MAX_PAGES pages.
    pub async fn get_all_list(
        &self,
        path: &str,
        params: &[(&str, &str)],
    ) -> Result<Vec<serde_json::Value>, AppError> {
        const MAX_PAGES: usize = 10;
        let mut all = Vec::new();
        let mut starting_after: Option<String> = None;

        for _ in 0..MAX_PAGES {
            let mut query_parts: Vec<String> = params
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect();
            query_parts.push("limit=100".to_string());
            if let Some(ref cursor) = starting_after {
                query_parts.push(format!("starting_after={}", cursor));
            }

            let full_path = format!("{}?{}", path, query_parts.join("&"));
            let resp = self.get(&full_path).await?;

            let data = resp["data"]
                .as_array()
                .ok_or_else(|| AppError::Stripe("Invalid list response format".to_string()))?;
            let has_more = resp["has_more"].as_bool().unwrap_or(false);

            if let Some(last) = data.last() {
                starting_after = last["id"].as_str().map(|s| s.to_string());
            }
            all.extend(data.clone());

            if !has_more {
                break;
            }
        }

        Ok(all)
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

    pub async fn delete_with_params(
        &self,
        path: &str,
        params: &[(&str, &str)],
    ) -> Result<serde_json::Value, AppError> {
        let url = format!("{}{}", STRIPE_BASE_URL, path);
        let query_parts: Vec<String> = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        let full_url = if query_parts.is_empty() {
            url
        } else {
            format!("{}?{}", url, query_parts.join("&"))
        };
        let resp = self
            .http
            .delete(&full_url)
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
