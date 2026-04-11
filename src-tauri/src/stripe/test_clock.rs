use serde::Deserialize;

use crate::error::AppError;
use crate::stripe::client::StripeClient;

#[derive(Debug, Deserialize)]
pub struct StripeTestClock {
    pub id: String,
    pub name: Option<String>,
    pub frozen_time: i64,
    pub status: String,
    pub created: i64,
}

pub async fn list_test_clocks(api_key: &str) -> Result<Vec<StripeTestClock>, AppError> {
    let client = StripeClient::new(api_key);
    let data = client.get_all_list("/v1/test_helpers/test_clocks", &[]).await?;
    let clocks: Vec<StripeTestClock> = data
        .into_iter()
        .map(serde_json::from_value)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(clocks)
}

pub async fn create_test_clock(
    api_key: &str,
    frozen_time: i64,
    name: Option<&str>,
) -> Result<StripeTestClock, AppError> {
    let client = StripeClient::new(api_key);
    let frozen_time_str = frozen_time.to_string();
    let mut params: Vec<(&str, &str)> = vec![("frozen_time", &frozen_time_str)];
    if let Some(n) = name {
        params.push(("name", n));
    }
    let resp = client.post("/v1/test_helpers/test_clocks", &params).await?;
    let clock: StripeTestClock = serde_json::from_value(resp)?;
    Ok(clock)
}

pub async fn get_test_clock(api_key: &str, clock_id: &str) -> Result<StripeTestClock, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/test_helpers/test_clocks/{}", clock_id);
    let resp = client.get(&path).await?;
    let clock: StripeTestClock = serde_json::from_value(resp)?;
    Ok(clock)
}

pub async fn advance_test_clock(
    api_key: &str,
    clock_id: &str,
    frozen_time: i64,
) -> Result<StripeTestClock, AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/test_helpers/test_clocks/{}/advance", clock_id);
    let frozen_time_str = frozen_time.to_string();
    let params = [("frozen_time", frozen_time_str.as_str())];
    let resp = client.post(&path, &params).await?;
    let clock: StripeTestClock = serde_json::from_value(resp)?;
    Ok(clock)
}

pub async fn delete_test_clock(api_key: &str, clock_id: &str) -> Result<(), AppError> {
    let client = StripeClient::new(api_key);
    let path = format!("/v1/test_helpers/test_clocks/{}", clock_id);
    client.delete(&path).await?;
    Ok(())
}
