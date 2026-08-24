package cn.koodle.smartcabinet.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class SqliteDirectoryEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("spring.datasource.url");
        if (!StringUtils.hasText(url) || !url.startsWith("jdbc:sqlite:")) {
            return;
        }

        String dbPath = url.substring("jdbc:sqlite:".length());
        int queryIndex = dbPath.indexOf('?');
        if (queryIndex >= 0) {
            dbPath = dbPath.substring(0, queryIndex);
        }
        if (!StringUtils.hasText(dbPath) || ":memory:".equals(dbPath) || dbPath.startsWith("file::memory:")) {
            return;
        }
        if (dbPath.startsWith("file:")) {
            dbPath = dbPath.substring("file:".length());
        }

        try {
            Path parent = Paths.get(dbPath).toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (Exception ignored) {
            // Let the DataSource fail with the original JDBC error if the path is invalid.
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
