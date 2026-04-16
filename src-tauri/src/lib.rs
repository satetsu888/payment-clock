mod commands;
mod db;
mod error;
mod models;
mod state;
mod stripe;
mod timestamp;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter, Manager,
};

use state::AppState;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Build application menu
            let check_update = MenuItemBuilder::with_id("check_update", "Check for Updates...")
                .build(app)?;
            let app_submenu = SubmenuBuilder::new(app, "Payment Clock")
                .about(None)
                .separator()
                .item(&check_update)
                .separator()
                .quit()
                .build()?;
            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let menu = MenuBuilder::new(app)
                .item(&app_submenu)
                .item(&edit_submenu)
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                if event.id() == "check_update" {
                    let _ = app_handle.emit("menu-check-update", ());
                }
            });

            let conn = db::connection::initialize_db(app.handle())?;
            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
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
            commands::test_clock::purge_test_clock,
            commands::test_clock::get_test_clock_detail,
            commands::test_clock::refresh_test_clock,
            commands::test_clock::preview_advance,
            commands::test_clock::get_resource_counts,
            commands::resource::create_customer,
            commands::resource::attach_payment_method,
            commands::resource::set_default_payment_method,
            commands::resource::list_payment_methods,
            commands::resource::detach_payment_method,
            commands::resource::create_subscription,
            commands::resource::cancel_subscription,
            commands::resource::pause_subscription,
            commands::resource::resume_subscription,
            commands::resource::update_subscription_items,
            commands::resource::update_subscription_trial,
            commands::resource::cancel_subscription_immediately,
            commands::resource::update_subscription_cancel_at,
            commands::resource::undo_cancel_subscription,
            commands::resource::update_subscription_billing_anchor,
            commands::resource::pause_subscription_with_options,
            commands::resource::apply_subscription_discount,
            commands::resource::create_product,
            commands::resource::archive_product,
            commands::resource::create_price,
            commands::resource::archive_price,
            commands::resource::list_products,
            commands::resource::list_prices,
            commands::resource::list_meters,
            commands::resource::create_meter,
            commands::resource::create_meter_event,
            commands::resource::fetch_test_clock_resources,
            commands::event::fetch_events,
            commands::event::get_test_clock_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
