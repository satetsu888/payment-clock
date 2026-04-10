use rusqlite::Connection;
use std::sync::{Arc, Mutex};

use crate::error::AppError;
use crate::models::{account, test_clock};

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
}

impl AppState {
    /// Get the API key for a given account, acquiring and releasing the DB lock.
    pub fn get_api_key(&self, account_id: &str) -> Result<String, AppError> {
        let db = self.db.lock().unwrap();
        account::get_api_key(&db, account_id)
    }

    /// Get the API key and Stripe test clock ID for a given account/test clock pair.
    pub fn get_api_key_and_clock(
        &self,
        account_id: &str,
        test_clock_id: &str,
    ) -> Result<(String, String), AppError> {
        let db = self.db.lock().unwrap();
        let api_key = account::get_api_key(&db, account_id)?;
        let clock = test_clock::get_by_id(&db, test_clock_id)?;
        Ok((api_key, clock.stripe_test_clock_id))
    }
}
