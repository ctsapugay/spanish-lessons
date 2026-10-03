@echo off
rem Windows: double-click to start Polyglotte. Keep this window open while you study.
cd /d "%~dp0"
where py >nul 2>nul && (py -3 scripts\serve.py) || (python scripts\serve.py)
if errorlevel 1 pause
