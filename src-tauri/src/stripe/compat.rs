/// Stripe API version compatibility helpers.
///
/// In API version 2025-03-31.basil, `current_period_start` and `current_period_end`
/// were removed from the top-level Subscription object and moved to each
/// SubscriptionItem (`items.data[]`).
///
/// This module provides version-aware accessors so callers don't need to know
/// which API version an account uses.

/// The API version where subscription period fields moved to items.
const SUBSCRIPTION_PERIOD_MOVED_VERSION: &str = "2025-03-31.basil";

/// Returns true if the given API version is >= the version where subscription
/// period fields moved from the top-level Subscription to SubscriptionItem.
fn has_item_level_period(api_version: &str) -> bool {
    // Stripe versions are lexicographically ordered (YYYY-MM-DD prefix).
    // Versions with a suffix like ".basil" sort after the bare date.
    api_version >= SUBSCRIPTION_PERIOD_MOVED_VERSION
}

/// Extract `current_period_end` from a subscription JSON object,
/// using the correct field path for the given API version.
pub fn subscription_current_period_end(
    subscription: &serde_json::Value,
    api_version: &str,
) -> Option<i64> {
    if has_item_level_period(api_version) {
        subscription["items"]["data"]
            .as_array()
            .and_then(|items| items.first())
            .and_then(|item| item["current_period_end"].as_i64())
    } else {
        subscription["current_period_end"].as_i64()
    }
}

/// Extract `current_period_start` from a subscription JSON object,
/// using the correct field path for the given API version.
pub fn subscription_current_period_start(
    subscription: &serde_json::Value,
    api_version: &str,
) -> Option<i64> {
    if has_item_level_period(api_version) {
        subscription["items"]["data"]
            .as_array()
            .and_then(|items| items.first())
            .and_then(|item| item["current_period_start"].as_i64())
    } else {
        subscription["current_period_start"].as_i64()
    }
}
