use serde::Serialize;

#[derive(Serialize)]
struct SmsSnapshot {
  raw_body: String,
}

#[tauri::command]
fn health() -> &'static str {
  "ok"
}

#[tauri::command]
fn fetch_sms_snapshot(sms_url: String) -> Result<SmsSnapshot, String> {
  let response = reqwest::blocking::get(&sms_url).map_err(|error| error.to_string())?;

  if !response.status().is_success() {
    return Err(format!("SMS fetch failed: {}", response.status()));
  }

  let raw_body = response.text().map_err(|error| error.to_string())?;
  Ok(SmsSnapshot { raw_body })
}

pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![health, fetch_sms_snapshot])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
