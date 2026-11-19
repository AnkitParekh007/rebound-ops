//! Starts and supervises the bundled ReboundOps server (Node runtime + bundled API).
//!
//! No GUI code lives here, so it can be unit-tested and reused by the smoke mode. The server binds
//! to loopback only and is told to shut down cleanly when its stdin closes
//! (`REBOUND_PARENT_WATCH=stdin`), which works on every platform, including Windows.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, ExitStatus, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// Where the bundled pieces live inside the app's resource folder.
#[derive(Debug, Clone)]
pub struct ServerPaths {
    pub node: PathBuf,
    pub script: PathBuf,
    pub web: PathBuf,
}

impl ServerPaths {
    pub fn from_resource_dir(dir: &Path) -> Self {
        let node = if cfg!(windows) { dir.join("runtime").join("node.exe") } else { dir.join("runtime").join("node") };
        Self { node, script: dir.join("server").join("main.mjs"), web: dir.join("web") }
    }

    /// The first missing piece, if any (a damaged or partial unzip).
    pub fn missing(&self) -> Option<PathBuf> {
        [self.node.clone(), self.script.clone(), self.web.join("index.html")].into_iter().find(|p| !p.exists())
    }
}

/// A free TCP port on 127.0.0.1. The listener is dropped before the server binds, so a race is
/// possible; `start` retries once on "port in use".
pub fn pick_port() -> std::io::Result<u16> {
    let l = TcpListener::bind(("127.0.0.1", 0))?;
    Ok(l.local_addr()?.port())
}

/// Minimal HTTP/1.1 GET against 127.0.0.1 (no TLS, no redirects). Returns the status and body.
pub fn http_get(port: u16, path: &str, timeout: Duration) -> Option<(u16, String)> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut s = TcpStream::connect_timeout(&addr, timeout).ok()?;
    s.set_read_timeout(Some(timeout)).ok()?;
    s.set_write_timeout(Some(timeout)).ok()?;
    write!(s, "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAccept: */*\r\nConnection: close\r\n\r\n").ok()?;
    let mut raw = Vec::new();
    s.read_to_end(&mut raw).ok()?;
    let text = String::from_utf8_lossy(&raw).into_owned();
    let status = text.split_whitespace().nth(1)?.parse().ok()?;
    let body = text.split_once("\r\n\r\n").map(|(_, b)| b.to_string()).unwrap_or_default();
    Some((status, body))
}

/// Keeps the last part of the server's stderr so a failed start can be explained to the person.
#[derive(Clone, Default)]
struct Tail(Arc<Mutex<String>>);

impl Tail {
    const MAX: usize = 8 * 1024;
    fn push(&self, line: &str) {
        let mut t = self.0.lock().unwrap_or_else(|e| e.into_inner());
        t.push_str(line);
        t.push('\n');
        if t.len() > Self::MAX {
            let cut = t.len() - Self::MAX;
            let cut = (cut..t.len()).find(|i| t.is_char_boundary(*i)).unwrap_or(t.len());
            t.drain(..cut);
        }
    }
    fn get(&self) -> String {
        self.0.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }
}

pub struct ServerProcess {
    child: Child,
    stdin: Option<ChildStdin>,
    stderr: Tail,
    pub port: u16,
}

#[derive(Debug, PartialEq, Eq)]
pub enum StartError {
    /// A bundled file is missing.
    Missing(PathBuf),
    /// The runtime could not be launched at all.
    Launch(String),
    /// The server exited during start-up; carries its explanation.
    Exited(String),
    /// No health response in time.
    Timeout,
}

impl std::fmt::Display for StartError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StartError::Missing(p) => write!(f, "A file ReboundOps needs is missing ({}). Unzip the download again and start ReboundOps from the new copy.", p.display()),
            StartError::Launch(e) => write!(f, "ReboundOps could not start its local server: {e}"),
            StartError::Exited(msg) => write!(f, "{msg}"),
            StartError::Timeout => write!(f, "ReboundOps' local server did not respond in time. Quit and open ReboundOps again."),
        }
    }
}

/// Turns the server's stderr into the one sentence worth showing, without paths to source files.
pub fn explain_exit(stderr: &str) -> String {
    let line = stderr
        .lines()
        .rev()
        .find(|l| l.contains("ReboundOps could not start"))
        .or_else(|| stderr.lines().rev().find(|l| !l.trim().is_empty()));
    match line {
        Some(l) => l.trim().trim_start_matches("ReboundOps could not start: ").to_string(),
        None => "The local server stopped unexpectedly.".to_string(),
    }
}

fn spawn(paths: &ServerPaths, port: u16, extra_env: &[(&str, &str)]) -> Result<ServerProcess, StartError> {
    if let Some(p) = paths.missing() {
        return Err(StartError::Missing(p));
    }
    let mut cmd = Command::new(&paths.node);
    cmd.arg(&paths.script)
        .current_dir(paths.script.parent().unwrap_or(Path::new(".")))
        .env("REBOUND_PARENT_WATCH", "stdin")
        .env("REBOUND_API_HOST", "127.0.0.1")
        .env("REBOUND_API_PORT", port.to_string())
        .env("REBOUND_WEB_DIST", &paths.web)
        // A NODE_OPTIONS from the person's shell must not change how the bundled server runs.
        .env_remove("NODE_OPTIONS")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    for (k, v) in extra_env {
        cmd.env(k, v);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = cmd.spawn().map_err(|e| StartError::Launch(e.to_string()))?;
    let stdin = child.stdin.take();
    let tail = Tail::default();
    if let Some(err) = child.stderr.take() {
        let tail = tail.clone();
        thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                tail.push(&line);
            }
        });
    }
    Ok(ServerProcess { child, stdin, stderr: tail, port })
}

impl ServerProcess {
    /// Starts the server on a free loopback port and waits until `/api/health` answers.
    /// Retries once with a new port if the chosen one was taken in the meantime.
    pub fn start(paths: &ServerPaths, extra_env: &[(&str, &str)], timeout: Duration) -> Result<ServerProcess, StartError> {
        let mut last = StartError::Timeout;
        for _ in 0..2 {
            let port = pick_port().map_err(|e| StartError::Launch(e.to_string()))?;
            let mut p = spawn(paths, port, extra_env)?;
            match p.wait_healthy(timeout) {
                Ok(()) => return Ok(p),
                Err(StartError::Exited(msg)) if msg.contains("already in use") => {
                    last = StartError::Exited(msg);
                    continue;
                }
                Err(e) => {
                    p.stop(Duration::from_secs(2));
                    return Err(e);
                }
            }
        }
        Err(last)
    }

    fn wait_healthy(&mut self, timeout: Duration) -> Result<(), StartError> {
        let end = Instant::now() + timeout;
        loop {
            if let Ok(Some(_)) = self.child.try_wait() {
                // Give the stderr reader a moment to collect the final line.
                thread::sleep(Duration::from_millis(150));
                return Err(StartError::Exited(explain_exit(&self.stderr.get())));
            }
            if let Some((200, _)) = http_get(self.port, "/api/health", Duration::from_millis(800)) {
                return Ok(());
            }
            if Instant::now() > end {
                return Err(StartError::Timeout);
            }
            thread::sleep(Duration::from_millis(150));
        }
    }

    pub fn origin(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    /// Asks the server to close (stdin closes), waits up to `grace`, then forces it.
    /// Returns the exit status when the server stopped on its own.
    pub fn stop(&mut self, grace: Duration) -> Option<ExitStatus> {
        drop(self.stdin.take());
        let end = Instant::now() + grace;
        loop {
            match self.child.try_wait() {
                Ok(Some(status)) => return Some(status),
                Ok(None) if Instant::now() < end => thread::sleep(Duration::from_millis(100)),
                _ => break,
            }
        }
        let _ = self.child.kill();
        let _ = self.child.wait();
        None
    }
}

impl Drop for ServerProcess {
    fn drop(&mut self) {
        if matches!(self.child.try_wait(), Ok(None)) {
            self.stop(Duration::from_secs(5));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_a_bindable_loopback_port() {
        let p = pick_port().unwrap();
        assert!(p > 0);
        TcpListener::bind(("127.0.0.1", p)).expect("port should be free again");
    }

    #[test]
    fn explains_the_servers_own_message() {
        let err = "some noise\nReboundOps could not start: ReboundOps is already running with this data folder (pid 42).\n";
        assert_eq!(explain_exit(err), "ReboundOps is already running with this data folder (pid 42).");
        assert_eq!(explain_exit(""), "The local server stopped unexpectedly.");
        assert_eq!(explain_exit("boom\n\n"), "boom");
    }

    #[test]
    fn reports_missing_bundle_files() {
        let paths = ServerPaths::from_resource_dir(Path::new("/definitely/not/here"));
        assert!(paths.missing().is_some());
        let err = ServerProcess::start(&paths, &[], Duration::from_secs(1)).err().unwrap();
        assert!(matches!(err, StartError::Missing(_)));
    }

    #[test]
    fn tail_keeps_the_end_on_char_boundaries() {
        let t = Tail::default();
        for _ in 0..2000 {
            t.push("ünïcödé line");
        }
        let s = t.get();
        assert!(s.len() <= Tail::MAX + 32);
        assert!(s.ends_with("ünïcödé line\n"));
    }

    #[test]
    fn http_get_reads_status_and_body() {
        let l = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = l.local_addr().unwrap().port();
        let h = thread::spawn(move || {
            let (mut s, _) = l.accept().unwrap();
            let mut buf = [0u8; 1024];
            let _ = s.read(&mut buf);
            s.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok").unwrap();
        });
        assert_eq!(http_get(port, "/api/health", Duration::from_secs(2)), Some((200, "ok".to_string())));
        h.join().unwrap();
    }

    /// End-to-end against a real staged server when REBOUND_TEST_STAGE points at apps/desktop/stage
    /// with a runtime/ folder (set by the packaging script); skipped otherwise.
    #[test]
    fn starts_and_stops_the_staged_server() {
        let Ok(stage) = std::env::var("REBOUND_TEST_STAGE") else { return };
        let data = std::env::temp_dir().join(format!("rbo-desktop-test-{}", std::process::id()));
        let data_s = data.to_string_lossy().to_string();
        let paths = ServerPaths::from_resource_dir(Path::new(&stage));
        let mut p = ServerProcess::start(&paths, &[("REBOUND_DATA_DIR", &data_s)], Duration::from_secs(30)).expect("server starts");
        let (status, body) = http_get(p.port, "/", Duration::from_secs(5)).unwrap();
        assert_eq!(status, 200);
        assert!(body.contains("<app-root") || body.contains("<base href"));
        let st = p.stop(Duration::from_secs(10)).expect("clean exit");
        assert!(st.success());
        assert!(!data.join("api.lock").exists());
        let _ = std::fs::remove_dir_all(&data);
    }
}
