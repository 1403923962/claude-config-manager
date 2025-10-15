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

// 切换配置
ipcMain.handle('switch-config', async (event, profileName, profile) => {
    try {
        const configFile = findConfigFile();

        // 备份当前配置
        if (fs.existsSync(configFile)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const backupFile = path.join(path.dirname(configFile), `config.backup.${timestamp}.json`);
            fs.copyFileSync(configFile, backupFile);
        }

        // 读取或创建配置
        let currentConfig = {};
        if (fs.existsSync(configFile)) {
            currentConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }

        // 更新配置
        currentConfig.baseURL = profile.baseURL;
        currentConfig.apiKey = profile.apiKey;

        // 保存配置
        fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), 'utf8');

        return { success: true, path: configFile };
    } catch (error) {
        console.error('Error switching config:', error);
        return { success: false, error: error.message };
    }
});
