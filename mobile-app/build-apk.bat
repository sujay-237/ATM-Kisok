@echo off
echo ========================================================
echo   SENTINEL MOBILE BANKING - ANDROID APK BUILDER
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Compiling mobile web bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Bundle compilation failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Syncing assets into Native Android Studio project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Generating Android APK...
echo Checking for Android SDK...

if defined ANDROID_HOME (
    goto LOCAL_BUILD
)
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    goto LOCAL_BUILD
)

echo.
echo No local Android SDK found on this system.
echo You have two options to get your APK:
echo.
echo   Option A: Build APK in the cloud with EAS Build (FREE, No SDK needed)
echo             Command: npx eas-cli build -p android --profile preview
echo.
echo   Option B: Open the generated Android project in Android Studio:
echo             Command: npx cap open android
echo             Then click: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo.
set /p CHOICE="Would you like to start EAS Cloud APK build now? (y/n): "
if /i "%CHOICE%"=="y" (
    call npx eas-cli build -p android --profile preview
)
pause
exit /b 0

:LOCAL_BUILD
echo Found Android SDK at %ANDROID_HOME%
echo Running Gradle assembleDebug...
cd android
call gradlew.bat assembleDebug
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] APK generated successfully!
    echo Output: android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo [ERROR] Gradle build failed. You can open the project in Android Studio using: npx cap open android
)
pause
