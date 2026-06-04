@echo off
set "JAVA_HOME=d:\AI_Workspace\Rookies\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set MAVEN_OPTS=-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true

echo JAVA_HOME is set to %JAVA_HOME%
java -version

"d:\AI_Workspace\Rookies\apache-maven-3.9.11\bin\mvn.cmd" -DskipTests clean package
if %errorlevel% neq 0 exit /b %errorlevel%

for %%i in (d:\AI_Workspace\Rookies\target\*SNAPSHOT*.jar) do set jar=%%i
"%JAVA_HOME%\bin\java.exe" -jar "%jar%"
