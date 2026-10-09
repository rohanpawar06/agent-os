FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN mkdir -p /data && chown 10001:10001 /data
COPY --from=build --chown=10001:10001 /workspace/target/agentos-backend-1.0.0.jar /app/agentos.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/agentos.jar"]
