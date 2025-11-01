// Tauri API - 等待 API 加载
console.log('Renderer.js 正在加载...');

// 等待 Tauri 完全加载
const waitForTauri = () => {
    return new Promise((resolve) => {
        if (window.__TAURI__?.core?.invoke) {
            console.log('Tauri API 已就绪');
            resolve();
        } else {
            console.log('等待 Tauri API...');
            setTimeout(() => waitForTauri().then(resolve), 100);
        }
    });
};

// 安全的 invoke 函数 - 始终从 window.__TAURI__ 获取
const getInvoke = () => {
    if (!window.__TAURI__?.core?.invoke) {
        throw new Error('Tauri API 尚未加载，请稍后重试');
    }
    return window.__TAURI__.core.invoke;
};

let profilesData = { profiles: {}, current: null };
let selectedProfile = null;
let editingProfile = null;
let apiKeyVisible = false;

// DOM Elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const profileForm = document.getElementById('profileForm');
const profilesList = document.getElementById('profilesList');
const emptyState = document.getElementById('emptyState');
const detailView = document.getElementById('detailView');
const welcomeView = document.getElementById('welcomeView');
const currentProfileName = document.getElementById('currentProfileName');

// Modal Elements
const profileNameInput = document.getElementById('profileName');
const profileBaseURLInput = document.getElementById('profileBaseURL');
const profileApiKeyInput = document.getElementById('profileApiKey');
const profileDescriptionInput = document.getElementById('profileDescription');

// Detail Elements
const detailName = document.getElementById('detailName');
const detailDescription = document.getElementById('detailDescription');
const detailBaseURL = document.getElementById('detailBaseURL');
const detailApiKey = document.getElementById('detailApiKey');
const detailCreated = document.getElementById('detailCreated');

// Toast Elements
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMessage = document.getElementById('toastMessage');

// Event Listeners
document.getElementById('addButton').addEventListener('click', showAddModal);
document.getElementById('welcomeAddButton').addEventListener('click', showAddModal);
document.getElementById('closeModalButton').addEventListener('click', closeModal);
document.getElementById('cancelButton').addEventListener('click', closeModal);
document.getElementById('editButton').addEventListener('click', editProfile);
document.getElementById('deleteButton').addEventListener('click', deleteProfile);
document.getElementById('switchButton').addEventListener('click', switchToProfile);
document.getElementById('toggleApiKeyButton').addEventListener('click', toggleApiKey);
document.getElementById('importButton').addEventListener('click', importConfig);
document.getElementById('exportButton').addEventListener('click', exportConfig);
profileForm.addEventListener('submit', handleFormSubmit);

// Close modal when clicking backdrop
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Initialize
async function init() {
    console.log('开始初始化应用');
    await loadProfiles();
    await updateCurrentProfile();
}

// Load profiles from storage
async function loadProfiles() {
    try {
        const invoke = getInvoke();
        profilesData = await invoke('load_profiles');
        renderProfiles();
    } catch (error) {
        console.error('Error loading profiles:', error);
        showToast('加载配置失败: ' + error, 'error');
    }
}

// Update current profile indicator
async function updateCurrentProfile() {
    try {
        const invoke = getInvoke();
        const config = await invoke('get_current_config');
        if (profilesData.current) {
            currentProfileName.textContent = profilesData.current;
        } else {
            currentProfileName.textContent = '-';
        }
    } catch (error) {
        console.error('Error updating current profile:', error);
        currentProfileName.textContent = '-';
    }
}

// Render profiles list
function renderProfiles() {
    const profiles = Object.entries(profilesData.profiles);

    if (profiles.length === 0) {
        profilesList.innerHTML = '';
        emptyState.classList.remove('hidden');
        detailView.classList.add('hidden');
        welcomeView.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    profilesList.innerHTML = '';

    profiles.forEach(([name, profile]) => {
        const card = document.createElement('div');
        card.className = `card p-4 rounded-xl cursor-pointer ${profilesData.current === name ? 'active' : ''}`;
        card.onclick = () => selectProfile(name);

        const header = document.createElement('div');
        header.className = 'flex items-start justify-between';

        const info = document.createElement('div');
        info.className = 'flex-1';

        const nameEl = document.createElement('h3');
        nameEl.className = 'font-semibold text-white text-lg mb-1';
        nameEl.textContent = name;

        const descEl = document.createElement('p');
        descEl.className = 'text-slate-400 text-sm line-clamp-2';
        descEl.textContent = profile.description || '无描述';

        info.appendChild(nameEl);
        info.appendChild(descEl);

        if (profilesData.current === name) {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 bg-purple-500 rounded text-xs font-medium';
            badge.textContent = '当前';
            header.appendChild(info);
            header.appendChild(badge);
        } else {
            header.appendChild(info);
        }

        card.appendChild(header);
        profilesList.appendChild(card);
    });
}

// Select a profile
function selectProfile(name) {
    selectedProfile = name;
    apiKeyVisible = false;
    showDetail();
}

// Show detail view
function showDetail() {
    if (!selectedProfile || !profilesData.profiles[selectedProfile]) {
        return;
    }

    const profile = profilesData.profiles[selectedProfile];

    detailName.textContent = selectedProfile;
    detailDescription.textContent = profile.description || '无描述';
    detailBaseURL.textContent = profile.baseURL;
    detailApiKey.textContent = maskApiKey(profile.apiKey);
    detailCreated.textContent = new Date(profile.created).toLocaleString('zh-CN');

    welcomeView.classList.add('hidden');
    detailView.classList.remove('hidden');

    // Update active state in list
    document.querySelectorAll('#profilesList .card').forEach((card, index) => {
        const profileName = Object.keys(profilesData.profiles)[index];
        if (profileName === selectedProfile) {
            card.classList.add('border-2', 'border-purple-400');
        } else {
            card.classList.remove('border-2', 'border-purple-400');
        }
    });
}

// Mask API key
function maskApiKey(key) {
    if (apiKeyVisible) {
        return key;
    }
    if (key.length <= 20) {
        return key.substring(0, 4) + '...';
    }
    return key.substring(0, 20) + '...';
}

// Toggle API key visibility
function toggleApiKey() {
    if (!selectedProfile) return;

    apiKeyVisible = !apiKeyVisible;
    const profile = profilesData.profiles[selectedProfile];
    detailApiKey.textContent = maskApiKey(profile.apiKey);
}

// Show add modal
function showAddModal() {
    editingProfile = null;
    modalTitle.textContent = '新建配置';
    profileNameInput.value = '';
    profileBaseURLInput.value = '';
    profileApiKeyInput.value = '';
    profileDescriptionInput.value = '';
    profileNameInput.disabled = false;
    modal.style.display = 'flex';
}

// Show edit modal
function editProfile() {
    if (!selectedProfile) return;

    const profile = profilesData.profiles[selectedProfile];
    editingProfile = selectedProfile;
    modalTitle.textContent = '编辑配置';
    profileNameInput.value = selectedProfile;
    profileBaseURLInput.value = profile.baseURL;
    profileApiKeyInput.value = profile.apiKey;
    profileDescriptionInput.value = profile.description || '';
    profileNameInput.disabled = true;
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    editingProfile = null;
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const name = profileNameInput.value.trim();
    const baseURL = profileBaseURLInput.value.trim();
    const apiKey = profileApiKeyInput.value.trim();
    const description = profileDescriptionInput.value.trim();

    if (!name || !baseURL || !apiKey) {
        showToast('请填写所有必填字段', 'error');
        return;
    }

    // Check if name already exists (when adding new)
    if (!editingProfile && profilesData.profiles[name]) {
        showToast('配置名称已存在', 'error');
        return;
    }

    // Add or update profile
    profilesData.profiles[name] = {
        baseURL,
        apiKey,
        description,
        created: editingProfile ? profilesData.profiles[name].created : new Date().toISOString()
    };

    // Save to storage
    try {
        const invoke = getInvoke();
        await invoke('save_profiles', { profiles: profilesData });
        showToast(editingProfile ? '配置已更新' : '配置已添加', 'success');
        closeModal();
        renderProfiles();

        // Select the newly added/edited profile
        selectedProfile = name;
        showDetail();
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('保存失败: ' + error, 'error');
    }
}

// Delete profile
async function deleteProfile() {
    if (!selectedProfile) return;

    if (!confirm(`确定要删除配置 "${selectedProfile}" 吗？`)) {
        return;
    }

    delete profilesData.profiles[selectedProfile];

    // If deleting current profile, clear current
    if (profilesData.current === selectedProfile) {
        profilesData.current = null;
    }

    // Save to storage
    try {
        const invoke = getInvoke();
        await invoke('save_profiles', { profiles: profilesData });
        showToast('配置已删除', 'success');
        selectedProfile = null;
        renderProfiles();
        await updateCurrentProfile();
    } catch (error) {
        console.error('Error deleting profile:', error);
        showToast('删除失败: ' + error, 'error');
    }
}

// Switch to profile
async function switchToProfile() {
    if (!selectedProfile) return;

    const profile = profilesData.profiles[selectedProfile];

    try {
        const invoke = getInvoke();
        showToast('正在切换配置...', 'info');

        await invoke('switch_config', {
            profileName: selectedProfile,
            profile: {
                baseURL: profile.baseURL,
                apiKey: profile.apiKey,
                description: profile.description || '',
                created: profile.created
            }
        });

        profilesData.current = selectedProfile;
        await invoke('save_profiles', { profiles: profilesData });

        showToast('配置已切换！新开 Claude Code 窗口即生效', 'success');
        renderProfiles();
        await updateCurrentProfile();
    } catch (error) {
        console.error('Error switching config:', error);
        showToast('切换失败: ' + error, 'error');
    }
}

// Export config
async function exportConfig() {
    try {
        const invoke = getInvoke();
        const jsonStr = await invoke('export_config');

        // 创建下载链接
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-configs-${new Date().toISOString().split('T')[0]}.cccm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('配置已导出为 .cccm 文件', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('导出失败: ' + error, 'error');
    }
}

// Import config
async function importConfig() {
    try {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cccm,.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const invoke = getInvoke();
                const text = await file.text();
                await invoke('import_config', { jsonStr: text });

                showToast('配置已导入成功！', 'success');

                // 重新加载配置
                await loadProfiles();
                renderProfiles();
                await updateCurrentProfile();
            } catch (error) {
                console.error('Import error:', error);
                showToast('导入失败: ' + error, 'error');
            }
        };

        input.click();
    } catch (error) {
        console.error('Import error:', error);
        showToast('导入失败: ' + error, 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const icons = {
        success: '<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        error: '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        info: '<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };

    toastIcon.innerHTML = icons[type] || icons.info;
    toastMessage.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Initialize on load - 等待 Tauri 就绪
window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 加载完成，等待 Tauri API...');
    await waitForTauri();
    console.log('开始初始化应用...');
    await init();
    console.log('应用初始化完成！');
});
