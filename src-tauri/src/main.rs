// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// Custom commands that can be called from JavaScript
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn show_about_dialog(window: tauri::Window) {
    let version = env!("CARGO_PKG_VERSION");
    let message = format!(
        "SageFlow Accounting\n\nVersion: {}\n\nModern accounting software for Ethiopian businesses.\n\n© 2026 SageFlow",
        version
    );
    
    tauri::api::dialog::message(
        Some(&window),
        "About SageFlow",
        message
    );
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Get the main window
            let window = app.get_window("main").unwrap();
            
            // Set window to be visible after setup
            window.show().unwrap();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            show_about_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
