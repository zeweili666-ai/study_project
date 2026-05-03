@echo off
cd /d "%~dp0"
javac -encoding UTF-8 -cp "lib\*" StudyPlannerServer.java
if errorlevel 1 pause & exit /b 1
java -cp ".;lib\*" StudyPlannerServer
