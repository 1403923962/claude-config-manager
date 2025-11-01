@echo off
echo 正在构建 Claude Config Manager 发布版...
echo 这可能需要几分钟，请耐心等待...
echo.
cd src-tauri
cargo tauri build
echo.
echo 构建完成！可执行文件位于：src-tauri\target\release\
pause
