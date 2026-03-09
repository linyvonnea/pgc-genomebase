@echo off
echo ===============================================
echo    Firestore Backup Tool
echo ===============================================
echo.

cd /d "C:\Users\PGCV\Documents\pgc-genomebase"

echo 🚀 Starting Firestore backup...
echo.

node scripts/firestore-backup.js

echo.
echo ===============================================
echo    Backup completed at %date% %time%
echo ===============================================

pause