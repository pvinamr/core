#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app data dir: {e}"))?;

    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("failed to create app data dir: {e}"))?;

    dir.push("core.sqlite3");
    Ok(dir)
}

fn open_db(app_handle: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app_handle)?;
    Ok(Connection::open(path).map_err(|e| e.to_string())?)
}

fn init_db(app_handle: &AppHandle) -> Result<(), String> {
    let conn = open_db(app_handle)?;
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS daily_pages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT NOT NULL UNIQUE, -- yyyy-mm-dd
            schedule    TEXT NOT NULL DEFAULT '',
            todo        TEXT NOT NULL DEFAULT '',
            goals       TEXT NOT NULL DEFAULT '',
            motivation  TEXT NOT NULL DEFAULT '',
            happiness   INTEGER NOT NULL DEFAULT 5,
            journal     TEXT NOT NULL DEFAULT ''
        );
        "#,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DailyPage {
    date: String,      // yyyy-mm-dd
    schedule: String,
    todo: String,
    goals: String,
    motivation: String,
    happiness: i64,    // 1–10
    journal: String,
}

#[tauri::command]
fn get_daily_page(
    app_handle: AppHandle,
    date: String,
) -> Result<Option<DailyPage>, String> {
    let conn = open_db(&app_handle)?;

    let mut stmt = conn
        .prepare(
            "SELECT date, schedule, todo, goals, motivation, happiness, journal
             FROM daily_pages
             WHERE date = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query(rusqlite::params![date])
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        // Each row.get(...).map_err(...) turns rusqlite::Error into String
        let date: String = row.get(0).map_err(|e| e.to_string())?;
        let schedule: String = row.get(1).map_err(|e| e.to_string())?;
        let todo: String = row.get(2).map_err(|e| e.to_string())?;
        let goals: String = row.get(3).map_err(|e| e.to_string())?;
        let motivation: String = row.get(4).map_err(|e| e.to_string())?;
        let happiness: i64 = row.get(5).map_err(|e| e.to_string())?;
        let journal: String = row.get(6).map_err(|e| e.to_string())?;

        Ok(Some(DailyPage {
            date,
            schedule,
            todo,
            goals,
            motivation,
            happiness,
            journal,
        }))
    } else {
        Ok(None)
    }
}


#[derive(Debug, Deserialize)]
struct SaveDailyPagePayload {
    date: String,
    schedule: String,
    todo: String,
    goals: String,
    motivation: String,
    happiness: i64,
    journal: String,
}

#[tauri::command]
fn save_daily_page(app_handle: AppHandle, payload: SaveDailyPagePayload) -> Result<(), String> {
    let conn = open_db(&app_handle)?;

    conn.execute(
        r#"
        INSERT INTO daily_pages (date, schedule, todo, goals, motivation, happiness, journal)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(date) DO UPDATE SET
            schedule = excluded.schedule,
            todo = excluded.todo,
            goals = excluded.goals,
            motivation = excluded.motivation,
            happiness = excluded.happiness,
            journal = excluded.journal;
        "#,
        params![
            payload.date,
            payload.schedule,
            payload.todo,
            payload.goals,
            payload.motivation,
            payload.happiness,
            payload.journal
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_db_path(app_handle: AppHandle) -> Result<String, String> {
    let path = db_path(&app_handle)?;
    Ok(path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_daily_page,
            save_daily_page,
            get_db_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
