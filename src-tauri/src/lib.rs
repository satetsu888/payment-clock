mod commands;
mod db;
mod error;
mod models;
mod state;
mod stripe;

use tauri::Manager;

use state::AppState;
use std::sync::Mutex;

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
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::account::validate_and_save_account,
            commands::account::list_accounts,
            commands::account::select_account,
            commands::account::delete_account,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
