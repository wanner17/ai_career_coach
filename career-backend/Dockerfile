# Build stage — compiles + packages the fat jar. Cached separately from the
# source copy so `docker compose build` doesn't re-download all of Maven
# Central on every code change, only when pom.xml itself changes.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Runtime stage — JRE only, no Maven/JDK/source left in the final image.
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/career-backend.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
