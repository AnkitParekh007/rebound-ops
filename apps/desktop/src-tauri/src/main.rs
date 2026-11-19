// Release builds on Windows are GUI apps: no console window behind ReboundOps.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    reboundops_desktop::run();
}
