package d1.duoxian.mqttserver;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.PooledByteBufAllocator;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.mqtt.MqttDecoder;
import io.netty.handler.codec.mqtt.MqttEncoder;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.timeout.IdleStateHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * @author Buter
 * date 2021/9/25 15:54
 */
public class MqttServerService {
    private final Logger logger = LoggerFactory.getLogger(MqttServerService.class);
    private NioEventLoopGroup bossGroup;
    private NioEventLoopGroup workGroup;
    private ClientSessionManager clientSessionManager;
    private LinkedBlockingQueue<WrapMqttMessage> eventQueue;
    private SslContext sslContext = null;
    public ClientSessionManager getClientSessionManager() {
        return clientSessionManager;
    }

    /**
     * @param port     监听的端口
     * @param listener 消息监听的实现
     */
    public void startup(int port, IMqttMessageListener listener, IMqttVerifyListener verifyListener) {
        startup(new MqttServerServiceOption.Builder()
                .port(port)
                .messageListener(listener)
                .verifyListener(verifyListener).build());
    }

    /**
     * @param port             监听的端口
     * @param listener         消息监听的实现
     * @param bossThreadNumber 负责接收accept消息的线程数，通常1个线程即可，传0或负数则为1，大于5的数则为5
     * @param workThreadNumber 负责处理事务的线程数，缺省是cpu的核心*2个数量，传0或负数则为缺省，大于100的数则为100
     */
    public void startup(int port, IMqttMessageListener listener, int bossThreadNumber, int workThreadNumber, IMqttVerifyListener verifyListener) {
        startup(new MqttServerServiceOption.Builder()
                .port(port)
                .messageListener(listener)
                .verifyListener(verifyListener)
                .bossThreadNumber(bossThreadNumber)
                .workThreadNumber(workThreadNumber)
                .build());
    }

    /**
     * @param port                 监听的端口
     * @param checkOfflineInterval 判断是否离线的时间间隔，缺省是90秒
     * @param maxBytesInMessage    最大一次性接收的报文长度，如果是图片之类的，这个值要设大一点，缺省是102400字节
     * @param listener             消息监听的实现
     * @param bossThreadNumber     负责接收accept消息的线程数，通常1个线程即可，传0或负数则为1，大于5的数则为5
     * @param workThreadNumber     负责处理事务的线程数，缺省是cpu的核心*2个数量，传0或负数则为缺省，大于100的数则为100
     */
    public void startup(int port, int checkOfflineInterval, int maxBytesInMessage, IMqttMessageListener listener, int bossThreadNumber, int workThreadNumber, IMqttVerifyListener verifyListener) {
        startup(new MqttServerServiceOption.Builder()
                .port(port)
                .messageListener(listener)
                .verifyListener(verifyListener)
                .bossThreadNumber(bossThreadNumber)
                .workThreadNumber(workThreadNumber)
                .checkOfflineInterval(checkOfflineInterval)
                .maxBytesInMessage(maxBytesInMessage)
                .build());
    }

    /**
     * 启动，以MqttServerServiceOption为参数
     *
     * @param option MqttServerServiceOption
     */
    public void startup(MqttServerServiceOption option) {
        if (option == null) {
            return;
        }
        try {
            eventQueue = new LinkedBlockingQueue<>(option.getMaxMessageCount());
            queueHandle(option);
            this.clientSessionManager = new ClientSessionManager();
            bossGroup = new NioEventLoopGroup(option.getBossThreadNumber());
            workGroup = option.getWorkThreadGroup();
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workGroup);
            MqttServerServiceManager.getInstance().register(this);
            //设置通道模式为非阻塞Server Socket
            bootstrap.channel(NioServerSocketChannel.class);
            //SO_REUSEADDR允许在同一端口上启动同一服务器的多个实例，只要每个实例捆绑一个不同的本地IP地址即可
            bootstrap.option(ChannelOption.SO_REUSEADDR, false);
            //标识当服务器请求处理线程全满时，用于临时存放已完成三次握手的请求的队列的最大长度
            bootstrap.option(ChannelOption.SO_BACKLOG, 1024);
            //禁用了Nagle算法，允许小包的发送
            bootstrap.childOption(ChannelOption.TCP_NODELAY, true);
            //开启心跳保活机制，缺省时间很长，2小时。IdleStateHandler更合适。
            bootstrap.childOption(ChannelOption.SO_KEEPALIVE, true);
            //非JVM管理的，由os管理的内存,减少数据传输的一次copy
            bootstrap.childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT);
            bootstrap.handler(new LoggingHandler(LogLevel.INFO));
            // 创建SSL上下文
            if (option.isSsl()) {
                sslContext = SslContextBuilder.forServer(new File(option.getServerCertFile()), new File(option.getKeyFile()))
                        .trustManager(new File(option.getCaCertFile())).build();
            }
            bootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ChannelPipeline channelPipeline = ch.pipeline();
                    if(sslContext!=null) {
                        // 将SSL上下文添加到ChannelPipeline中
                        channelPipeline.addLast(sslContext.newHandler(ch.alloc()));
                    }
                    // 设置读写空闲超时时间，单位是秒.这里只考虑读，也就是channelRead() 方法超过 readerIdleTime 时间未被调用则会触发超时事件调用 userEventTrigger()。
                    channelPipeline.addLast(new IdleStateHandler(option.getCheckOfflineInterval(), 0, 0));
                    channelPipeline.addLast("encoder", MqttEncoder.INSTANCE);
                    channelPipeline.addLast("decoder", new MqttDecoder(option.getMaxBytesInMessage()));
                    channelPipeline.addLast(new MqttChannelInboundHandler(option, clientSessionManager, eventQueue));
                }
            });
            ChannelFuture f = bootstrap.bind(option.getPort()).sync();
            f.channel().closeFuture().sync();

        } catch (Exception e) {
            logger.error("mqtt server startup failed", e);
        } finally {
            if (workGroup != null && bossGroup != null) {
                workGroup.shutdownGracefully();
                bossGroup.shutdownGracefully();
            }
        }
    }

    private void queueHandle(MqttServerServiceOption option) {
        //从队列里去消息处理，可以提供mqttsever的并发处理能力
        new Thread(() -> {
            while (true) {
                try {
                    WrapMqttMessage message = eventQueue.take();
                    IMqttMessageListener listener = option.getMessageListener();
                    if (listener != null) {
                        listener.onMessage(message.getClientIp(), message.getChannelId(), message.getTopic(), message.getContent(), message.getPublisher());
                    }
                } catch (Exception e) {
                    logger.error("take message failed", e);
                }
            }
        }).start();
    }

    /**
     * 手动关闭mqtt监听
     */
    public void close() {
        if (workGroup != null && bossGroup != null) {
            workGroup.shutdownGracefully();
            bossGroup.shutdownGracefully();
        }
    }
}
