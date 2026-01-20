@echo off
echo ========================================
echo YESSWERA - Iniciando Frontend
echo ========================================
echo.

echo [1/2] Verificando node_modules...
if not exist "node_modules" (
    echo node_modules no encontrado. Instalando dependencias...
    echo Esto puede tardar varios minutos...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo.
echo [2/2] Iniciando Expo...
echo ========================================
echo.
echo Opciones disponibles:
echo   w - Abrir en browser ^(para negocio^)
echo   Escanear QR con Expo Go ^(para repartidor^)
echo.
echo ========================================
echo.

call npx expo start
