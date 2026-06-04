@echo off
set "JAVA_HOME=d:\AI_Workspace\Rookies\jdk-17\jdk-17.0.12+7"
rem Add JDK bin to PATH
set "PATH=%JAVA_HOME%\bin;%PATH%"
rem Disable Maven SSL verification
set MAVEN_OPTS=-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true

rem Build the project
"d:\AI_Workspace\Rookies\apache-maven-3.9.11\bin\mvn.cmd" -DskipTests clean package
if errorlevel 1 (
    echo Maven build failed
    exit /b 1
)

rem Find the built JAR
for %%F in (target\*SNAPSHOT*.jar) do set JAR=%%F

rem Run the application
"%JAVA_HOME%\bin\java.exe" -jar "%JAR%"
