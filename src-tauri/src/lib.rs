mod commands;
mod db;
mod error;
mod models;
mod state;
mod stripe;

use tauri::Manager;

use state::AppState;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let conn = db::connection::initialize_db(app.handle())?;
            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                cli_process: Arc::new(Mutex::new(None)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::account::validate_and_save_account,
            commands::account::list_accounts,
            commands::account::select_account,
            commands::account::delete_account,
            commands::test_clock::list_test_clocks,
            commands::test_clock::create_test_clock,
            commands::test_clock::advance_test_clock,
            commands::test_clock::delete_test_clock,
            commands::test_clock::get_test_clock_detail,
            commands::test_clock::refresh_test_clock,
            commands::resource::create_customer,
            commands::resource::attach_payment_method,
            commands::resource::create_subscription,
            commands::resource::list_products,
            commands::resource::list_prices,
            commands::resource::fetch_test_clock_resources,
            commands::event::fetch_events,
            commands::event::get_test_clock_events,
            commands::event::start_stripe_cli,
            commands::event::stop_stripe_cli,
            commands::event::get_stripe_cli_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
