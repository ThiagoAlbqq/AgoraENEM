@echo off
chcp 65001 >nul
title AgoraENEM - Sistema de Avaliação de Redações
color 0A
cls

echo =======================================================================
echo              🚀 INICIANDO PLATAFORMA AGORAENEM (ENEM x SISEDU)
echo =======================================================================
echo.

:: 1. Verificar se as dependências do Backend estão instaladas
if not exist "backend\node_modules\" (
    echo [1/3] Instalação de dependências do Backend necessária...
    cd backend
    call npm install
    cd ..
    echo [1/3] Dependências do Backend instaladas com sucesso!
) else (
    echo [1/3] Backend dependências verificadas.
)

:: 2. Verificar se as dependências do Frontend estão instaladas
if not exist "frontend\node_modules\" (
    echo [2/3] Instalação de dependências do Frontend necessária...
    cd frontend
    call npm install
    cd ..
    echo [2/3] Dependências do Frontend instaladas com sucesso!
) else (
    echo [2/3] Frontend dependências verificadas.
)

echo.
echo [3/3] Iniciando Servidores em segundo plano...

:: Iniciar Servidor Backend Express (Porta 3001)
start "AgoraENEM Backend" /min cmd /c "cd backend && npm start"

:: Aguardar 2 segundos
timeout /t 2 /nobreak >nul

:: Iniciar Servidor Frontend Vite (Porta 5173)
start "AgoraENEM Frontend" /min cmd /c "cd frontend && npm run dev"

:: Aguardar 3 segundos e abrir o navegador padrão no endereço local
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo =======================================================================
echo   ✅ SISTEMA EXECUTADO COM SUCESSO!
echo   
echo   - Backend API: http://localhost:3001
echo   - Frontend Web: http://localhost:5173
echo.
echo   O seu navegador padrão foi aberto automaticamente.
echo   Você pode minimizar esta janela enquanto utiliza a plataforma.
echo =======================================================================
echo.
pause
