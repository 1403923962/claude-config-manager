const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

// 配置文件路径
const userHome = os.homedir();
const configPaths = [
    path.join(userHome, '.claude', 'config.json'),
    path.join(userHome, '.config', 'claude', 'config.json'),
    path.join(process.env.APPDATA || '', 'Claude', 'config.json')
].filter(p => p);

const managerConfigPath = path.join(userHome, '.claude_configs.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#0f172a',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        frame: true,
        titleBarStyle: 'default',
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');

    // 开发时打开调试工具
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 处理函数

// 查找配置文件
function findConfigFile() {
    for (const path of configPaths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }
    const defaultPath = configPaths[0];
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return defaultPath;
}

// 加载配置方案
ipcMain.handle('load-profiles', async () => {
    try {
        if (fs.existsSync(managerConfigPath)) {
            const data = fs.readFileSync(managerConfigPath, 'utf8');
            return JSON.parse(data);
        }
        return { profiles: {}, current: null };
    } catch (error) {
        console.error('Error loading profiles:', error);
        return { profiles: {}, current: null };
    }
});

// 保存配置方案
ipcMain.handle('save-profiles', async (event, profiles) => {
    try {
        fs.writeFileSync(managerConfigPath, JSON.stringify(profiles, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error saving profiles:', error);
        return { success: false, error: error.message };
    }
});

// 获取当前 Claude 配置
ipcMain.handle('get-current-config', async () => {
    try {
        const configFile = findConfigFile();
        if (fs.existsSync(configFile)) {
            const data = fs.readFileSync(configFile, 'utf8');
            return { success: true, config: JSON.parse(data), path: configFile };
        }
        return { success: false, error: '配置文件不存在' };
    } catch (error) {
        console.error('Error reading config:', error);
        return { success: false, error: error.message };
    }
});

// 切换配置（使用环境变量）
ipcMain.handle('switch-config', async (event, profileName, profile) => {
    try {
        const { execSync } = require('child_process');

        // 设置环境变量（Windows 系统级）
        const commands = [
            `[System.Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', '${profile.baseURL}', 'User')`,
            `[System.Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', '${profile.apiKey}', 'User')`
        ];

        for (const cmd of commands) {
            execSync(`powershell -Command "${cmd}"`, { encoding: 'utf8' });
        }

        // 同时更新 config.json 文件（作为备份）
        const configFile = findConfigFile();
        let currentConfig = {};
        if (fs.existsSync(configFile)) {
            currentConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }
        currentConfig.baseURL = profile.baseURL;
        currentConfig.apiKey = profile.apiKey;
        fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), 'utf8');

        return { success: true, path: configFile };
    } catch (error) {
        console.error('Error switching config:', error);
        return { success: false, error: error.message };
    }
});
