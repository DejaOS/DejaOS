package cn.koodle.smartcabinet.common.utils;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 线程管理类
 *
 * @author Buter
 * @date 2021/9/2 5:24
 */
public class ThreadManager {
    private static ThreadManager instance;
    private final ThreadPoolExecutor executor;

    public ThreadPoolExecutor getExecutor() {
        return executor;
    }

    private ThreadManager() {
        int corePoolSize = 600;
        int maxPoolSize = corePoolSize * 2;
        executor = new ThreadPoolExecutor(corePoolSize,
                maxPoolSize,
                5,
                TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(10),
                new ThreadPoolExecutor.AbortPolicy());
    }

    public static ThreadManager getInstance() {
        if (instance == null) {
            instance = new ThreadManager();
        }
        return instance;
    }

    public void execute(Runnable runnable) {
        ((ExecutorService) executor).execute(runnable);
    }
}
