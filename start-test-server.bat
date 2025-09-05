@echo off
echo 🚀 Iniciando servidor local para testes...
echo.
echo Acesse: http://localhost:8080/tests/test-sync-system.html
echo.
echo Para parar: Ctrl+C
echo.
cd /d "%~dp0"
python -m http.server 8080
pause