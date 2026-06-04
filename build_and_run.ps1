$env:JAVA_HOME = 'd:\AI_Workspace\Rookies\jdk-17\jdk-17.0.12+7'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:MAVEN_OPTS = '-Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true'

# Build the project
& 'd:\AI_Workspace\Rookies\apache-maven-3.9.11\bin\mvn.cmd' -DskipTests clean package
if ($LASTEXITCODE -ne 0) {
    Write-Error "Maven build failed"
    exit $LASTEXITCODE
}

# Locate the generated JAR
$jar = Get-ChildItem -Path 'd:\AI_Workspace\Rookies\target' -Filter '*SNAPSHOT*.jar' | Select-Object -First 1 -ExpandProperty FullName
if (-not $jar) {
    Write-Error "Jar not found"
    exit 1
}

# Run the Spring Boot application
& "$env:JAVA_HOME\bin\java.exe" -jar $jar
