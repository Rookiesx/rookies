FROM eclipse-temurin:17-jdk-alpine
VOLUME /tmp
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src
RUN ./mvnw install -DskipTests
EXPOSE 8080
ENTRYPOINT ["java","-jar","target/realtime-messaging-app-0.0.1-SNAPSHOT.jar"]
