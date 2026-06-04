# Realtime Messaging App

A small Spring Boot realtime chat app using native WebSockets and a browser client.

## Requirements

- Java 8 or newer
- Maven 3.6 or newer

## Run

```powershell
.\start-app.ps1
```

To rebuild and run with the bundled portable Maven:

```powershell
.\run-app.ps1
```

If Maven is installed globally, this also works:

```powershell
mvn spring-boot:run
```

If your local Java runtime is old and Maven fails with SSL certificate errors, use the bundled JDK 26 instead:

```powershell
$env:JAVA_HOME = "${PWD}\oracleJdk-26"
$env:PATH = "${env:JAVA_HOME}\bin;" + $env:PATH
.\apache-maven-3.9.11\bin\mvn.cmd -s "${PWD}\maven-settings.xml" -DskipTests spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080), click **Connect**, and open the same URL in another browser tab to chat in real time.

## Project Structure

- `src/main/java/com/example/messaging/config/WebSocketConfig.java` registers the `/chat` WebSocket endpoint.
- `src/main/java/com/example/messaging/websocket/ChatWebSocketHandler.java` tracks connected sessions and broadcasts messages.
- `src/main/resources/static/index.html` contains the browser chat UI.
- `src/main/resources/static/app.js` connects to the WebSocket endpoint and renders messages.
