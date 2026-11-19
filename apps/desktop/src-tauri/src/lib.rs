//! ReboundOps desktop shell.
//!
//! Opens a native window, starts the bundled local server (see `server.rs`) and shows the app
//! from `http://127.0.0.1:<port>`. The window can only show that local origin; any other link opens
//! in the person's own browser. Quitting closes the server cleanly, which releases the data folder.
//!
//! `REBOUND_DESKTOP_SMOKE=1` runs start → checks → clean stop without a window and exits with 0 or 1,
//! so CI can test the real packaged app on each platform.

pub mod server;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use server::{http_get, ServerPaths, ServerProcess};
use tauri::webview::{DownloadEvent, NewWindowResponse};
use tauri::{AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder};

const START_TIMEOUT: Duration = Duration::from_secs(30);
const STOP_GRACE: Duration = Duration::from_secs(5);

type Shared = Arc<Mutex<Option<ServerProcess>>>;

/// Pages the window itself may show: the bundled splash page and the local server.
fn is_internal(url: &Url, server_port: Option<u16>) -> bool {
    match url.scheme() {
        "tauri" | "about" => true,
        // Windows serves bundled pages from http(s)://tauri.localhost.
        "http" | "https" if url.host_str() == Some("tauri.localhost") => true,
        "http" => url.host_str() == Some("127.0.0.1") && server_port.is_some() && url.port() == server_port,
        _ => false,
    }
}

/// Links the person may open in their own browser or mail app.
fn is_external_safe(url: &Url) -> bool {
    matches!(url.scheme(), "https" | "http" | "mailto")
}

fn open_externally(url: &Url) {
    if is_external_safe(url) {
        let _ = tauri_plugin_opener::open_url(url.as_str(), None::<&str>);
    }
}

fn show_error(app: &AppHandle, message: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let msg = serde_json::to_string(message).unwrap_or_else(|_| "\"ReboundOps could not start.\"".into());
        let _ = w.eval(format!("window.rboShowError && window.rboShowError({msg})"));
    }
}

/// Small confirmation shown inside the app after a file was saved to Downloads.
fn show_saved(app: &AppHandle, success: bool) {
    if let Some(w) = app.get_webview_window("main") {
        let text = if success { "Saved to your Downloads folder." } else { "The download did not finish. Try again." };
        let text = serde_json::to_string(text).unwrap_or_default();
        let _ = w.eval(format!(
            "(()=>{{const d=document.createElement('div');d.setAttribute('role','status');d.textContent={text};\
             d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;\
             padding:10px 16px;border-radius:999px;background:#0d1320;color:#fff;font:600 14px system-ui,sans-serif;\
             box-shadow:0 8px 24px rgba(0,0,0,.3)';document.body.appendChild(d);setTimeout(()=>d.remove(),3500);}})()"
        ));
    }
}

fn start_server(app: AppHandle, shared: Shared, paths: ServerPaths) {
    std::thread::spawn(move || match ServerProcess::start(&paths, &[], START_TIMEOUT) {
        Ok(process) => {
            let origin = process.origin();
            let port = process.port;
            *shared.lock().unwrap_or_else(|e| e.into_inner()) = Some(process);
            PORT.lock().unwrap_or_else(|e| e.into_inner()).replace(port);
            if let (Some(w), Ok(url)) = (app.get_webview_window("main"), Url::parse(&format!("{origin}/"))) {
                let _ = w.navigate(url);
            }
        }
        Err(e) => show_error(&app, &e.to_string()),
    });
}

/// The port the window may navigate to, set once the server is up.
static PORT: Mutex<Option<u16>> = Mutex::new(None);

fn allowed_port() -> Option<u16> {
    *PORT.lock().unwrap_or_else(|e| e.into_inner())
}

/// Smoke mode: start the bundled server with a temporary data folder, check it serves the API and
/// the web app, stop it, and verify a clean exit with the lock released. Returns the exit code.
fn smoke(paths: &ServerPaths) -> i32 {
    let data = std::env::temp_dir().join(format!("reboundops-desktop-smoke-{}", std::process::id()));
    let data_s = data.to_string_lossy().to_string();
    let result = (|| -> Result<(), String> {
        let mut p = ServerProcess::start(paths, &[("REBOUND_DATA_DIR", &data_s)], START_TIMEOUT).map_err(|e| e.to_string())?;
        println!("smoke: server healthy on {}", p.origin());
        let (status, body) = http_get(p.port, "/", Duration::from_secs(5)).ok_or("no response for /")?;
        if status != 200 || !(body.contains("<app-root") || body.contains("<base href")) {
            return Err(format!("web app not served (status {status})"));
        }
        println!("smoke: web app served");
        let (status, _) = http_get(p.port, "/api/health", Duration::from_secs(5)).ok_or("no health response")?;
        if status != 200 {
            return Err(format!("health returned {status}"));
        }
        let exit = p.stop(Duration::from_secs(10)).ok_or("server did not stop on its own after stdin closed")?;
        if !exit.success() {
            return Err(format!("server exited with {exit}"));
        }
        if data.join("api.lock").exists() {
            return Err("data-folder lock left behind".into());
        }
        println!("smoke: clean shutdown, lock released");
        Ok(())
    })();
    let _ = std::fs::remove_dir_all(&data);
    match result {
        Ok(()) => {
            println!("smoke: passed");
            0
        }
        Err(e) => {
            eprintln!("smoke: FAILED: {e}");
            1
        }
    }
}

/// The packaged resource folder, found without starting any GUI code: `Contents/Resources` inside
/// the macOS app bundle, the executable's own folder on Windows (portable zip). Smoke mode uses
/// this so it can run on machines without a window session.
fn resource_dir_from_exe() -> Option<std::path::PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    if cfg!(target_os = "macos") {
        Some(dir.parent()?.join("Resources"))
    } else {
        Some(dir.to_path_buf())
    }
}

pub fn run() {
    if std::env::var("REBOUND_DESKTOP_SMOKE").as_deref() == Ok("1") {
        let code = match resource_dir_from_exe() {
            Some(dir) => smoke(&ServerPaths::from_resource_dir(&dir)),
            None => {
                eprintln!("smoke: FAILED: cannot locate the app's resource folder");
                1
            }
        };
        std::process::exit(code);
    }

    let shared: Shared = Arc::new(Mutex::new(None));
    let for_setup = shared.clone();
    let for_exit = shared.clone();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let paths = ServerPaths::from_resource_dir(&app.path().resource_dir()?);
            let handle = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("ReboundOps")
                .inner_size(1280.0, 840.0)
                .min_inner_size(900.0, 620.0)
                .on_navigation(|url| {
                    if is_internal(url, allowed_port()) {
                        true
                    } else {
                        open_externally(url);
                        false
                    }
                })
                .on_new_window(|url, _features| {
                    // target="_blank" links (for example an employer's official application page).
                    open_externally(&url);
                    NewWindowResponse::Deny
                })
                .on_download(move |webview, event| {
                    if let DownloadEvent::Finished { success, .. } = event {
                        show_saved(webview.app_handle(), success);
                    }
                    // Allow: wry saves into Downloads and never overwrites an existing file.
                    true
                })
                .build()?;
            start_server(handle, for_setup.clone(), paths);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("ReboundOps could not open its window");

    app.run(move |_app, event| {
        if let RunEvent::Exit = event {
            if let Some(mut p) = for_exit.lock().unwrap_or_else(|e| e.into_inner()).take() {
                p.stop(STOP_GRACE);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    #[test]
    fn only_the_local_server_and_bundled_pages_stay_in_the_window() {
        assert!(is_internal(&u("tauri://localhost/index.html"), None));
        assert!(is_internal(&u("http://tauri.localhost/index.html"), None));
        assert!(is_internal(&u("http://127.0.0.1:5123/jobs"), Some(5123)));
        assert!(!is_internal(&u("http://127.0.0.1:5124/"), Some(5123)));
        assert!(!is_internal(&u("http://127.0.0.1:5123/"), None));
        assert!(!is_internal(&u("http://localhost:5123/"), Some(5123)));
        assert!(!is_internal(&u("https://jobs.example.com/apply"), Some(5123)));
        assert!(!is_internal(&u("file:///etc/passwd"), Some(5123)));
    }

    #[test]
    fn only_web_and_mail_links_open_outside() {
        assert!(is_external_safe(&u("https://jobs.example.com/apply")));
        assert!(is_external_safe(&u("mailto:recruiter@example.com")));
        assert!(!is_external_safe(&u("file:///Users/x/secret.txt")));
        assert!(!is_external_safe(&u("javascript:alert(1)")));
        assert!(!is_external_safe(&u("smb://server/share")));
    }
}
