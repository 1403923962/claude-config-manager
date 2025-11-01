// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Profile {
    #[serde(rename = "baseURL")]
    base_url: String,
    #[serde(rename = "apiKey")]
    api_key: String,
    description: String,
    created: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProfilesData {
    profiles: HashMap<String, Profile>,
    current: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaudeConfig {
    #[serde(rename = "baseURL")]
    base_url: String,
    #[serde(rename = "apiKey")]
    api_key: String,
}

// 获取配置文件路径
fn get_home_dir() -> PathBuf {
    dirs::home_dir().expect("无法获取用户主目录")
}

fn get_manager_config_path() -> PathBuf {
    // 优先使用新的 .cccm 格式
    let cccm_path = get_home_dir().join("claude-configs.cccm");
    let old_path = get_home_dir().join(".claude_configs.json");

    // 如果旧文件存在但新文件不存在，返回旧文件路径（稍后会迁移）
    if old_path.exists() && !cccm_path.exists() {
        return old_path;
    }

    cccm_path
}

fn get_claude_config_paths() -> Vec<PathBuf> {
    let home = get_home_dir();
    vec![
        home.join(".claude").join("config.json"),
        home.join(".config").join("claude").join("config.json"),
    ]
}

fn find_config_file() -> Option<PathBuf> {
    for path in get_claude_config_paths() {
        if path.exists() {
            return Some(path);
        }
    }
    // 返回默认路径
    let default_path = get_claude_config_paths()[0].clone();
    if let Some(parent) = default_path.parent() {
        fs::create_dir_all(parent).ok();
    }
    Some(default_path)
}

// IPC Commands

#[tauri::command]
fn load_profiles() -> Result<ProfilesData, String> {
    let path = get_manager_config_path();

    if path.exists() {
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("读取配置文件失败: {}", e))?;
        let data: ProfilesData = serde_json::from_str(&content)
            .map_err(|e| format!("解析配置文件失败: {}", e))?;
        Ok(data)
    } else {
        Ok(ProfilesData {
            profiles: HashMap::new(),
            current: None,
        })
    }
}

#[tauri::command]
fn save_profiles(profiles: ProfilesData) -> Result<(), String> {
    let path = get_manager_config_path();
    let json = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    // 如果保存到新格式成功，删除旧格式文件
    let old_path = get_home_dir().join(".claude_configs.json");
    if old_path.exists() && path != old_path {
        let _ = fs::remove_file(old_path); // 忽略删除错误
    }

    Ok(())
}

#[tauri::command]
fn export_config() -> Result<String, String> {
    let profiles = load_profiles()?;
    serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("导出失败: {}", e))
}

#[tauri::command]
fn import_config(json_str: String) -> Result<(), String> {
    let profiles: ProfilesData = serde_json::from_str(&json_str)
        .map_err(|e| format!("导入失败: JSON 格式错误: {}", e))?;
    save_profiles(profiles)
}

#[tauri::command]
fn get_current_config() -> Result<ClaudeConfig, String> {
    if let Some(config_file) = find_config_file() {
        if config_file.exists() {
            let content = fs::read_to_string(&config_file)
                .map_err(|e| format!("读取 Claude 配置失败: {}", e))?;
            let config: ClaudeConfig = serde_json::from_str(&content)
                .map_err(|e| format!("解析 Claude 配置失败: {}", e))?;
            Ok(config)
        } else {
            Err("配置文件不存在".to_string())
        }
    } else {
        Err("找不到配置文件路径".to_string())
    }
}

#[tauri::command]
async fn switch_config(_profile_name: String, profile: Profile) -> Result<String, String> {
    // 1. 使用 setx 设置环境变量
    let base_url = profile.base_url.clone();
    let api_key = profile.api_key.clone();

    // 设置 ANTHROPIC_BASE_URL
    let output1 = Command::new("cmd")
        .args(&["/C", "setx", "ANTHROPIC_BASE_URL", &base_url])
        .output()
        .map_err(|e| format!("执行 setx 命令失败: {}", e))?;

    if !output1.status.success() {
        return Err(format!("设置 ANTHROPIC_BASE_URL 失败: {}",
            String::from_utf8_lossy(&output1.stderr)));
    }

    // 设置 ANTHROPIC_AUTH_TOKEN
    let output2 = Command::new("cmd")
        .args(&["/C", "setx", "ANTHROPIC_AUTH_TOKEN", &api_key])
        .output()
        .map_err(|e| format!("执行 setx 命令失败: {}", e))?;

    if !output2.status.success() {
        return Err(format!("设置 ANTHROPIC_AUTH_TOKEN 失败: {}",
            String::from_utf8_lossy(&output2.stderr)));
    }

    // 2. 同时更新 config.json 文件作为备份
    if let Some(config_file) = find_config_file() {
        let mut current_config = if config_file.exists() {
            let content = fs::read_to_string(&config_file).unwrap_or_default();
            serde_json::from_str::<ClaudeConfig>(&content).unwrap_or(ClaudeConfig {
                base_url: String::new(),
                api_key: String::new(),
            })
        } else {
            ClaudeConfig {
                base_url: String::new(),
                api_key: String::new(),
            }
        };

        current_config.base_url = profile.base_url;
        current_config.api_key = profile.api_key;

        let json = serde_json::to_string_pretty(&current_config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        fs::write(&config_file, json)
            .map_err(|e| format!("写入配置文件失败: {}", e))?;

        Ok(config_file.to_string_lossy().to_string())
    } else {
        Err("找不到配置文件路径".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_profiles,
            save_profiles,
            get_current_config,
            switch_config,
            export_config,
            import_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
