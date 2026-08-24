package d1.duoxian.mqttserver;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufUtil;
import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.handler.codec.mqtt.*;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.util.ReferenceCountUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetSocketAddress;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.stream.Collectors;

/**
 * @author Buter
 * date 2021/10/3 14:43
 */
public class MqttChannelInboundHandler extends ChannelInboundHandlerAdapter {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final Map<String, Channel> channelMap = new ConcurrentHashMap<>();
    private final IMqttMessageListener listener;
    private final IMqttVerifyListener verifyListener;
    private final ClientSessionManager clientSessionManager;
    private final Charset defaultCharset;
    private final LinkedBlockingQueue<WrapMqttMessage> eventQueue;

    public MqttChannelInboundHandler(MqttServerServiceOption option, ClientSessionManager clientSessionManager, LinkedBlockingQueue<WrapMqttMessage> eventQueue) {
        this.listener = option.getMessageListener();
        this.verifyListener = option.getVerifyListener();
        this.clientSessionManager = clientSessionManager;
        this.defaultCharset = option.getDefaultCharset();
        this.clientSessionManager.setListener(this.listener);
        this.eventQueue = eventQueue;
    }

    /**
     * 从客户端收到新的数据时，这个方法会在收到消息时被调用
     */
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        //logger.info("MQTT channelRead:{}", ctx.channel().id().asLongText());
        if (msg == null) {
            return;
        }
        try {
            MqttMessage mqttMessage = (MqttMessage) msg;
            MqttFixedHeader mqttFixedHeader = mqttMessage.fixedHeader();
            if (mqttFixedHeader == null) {
                logger.info("接收到MQTT消息，但是header为null，mqttMessage={}", mqttMessage);
                return;
            }
        /*if (mqttFixedHeader.messageType() != MqttMessageType.PINGREQ) {
            logger.info("接收到MQTT消息--" + mqttMessage.toString());
        }*/
            Channel channel = ctx.channel();
            InetSocketAddress ipSocket = (InetSocketAddress) channel.remoteAddress();
            String clientIp = ipSocket.getAddress().getHostAddress();
            switch (mqttFixedHeader.messageType()) {
                case CONNECT:
                    //	这里直接返回一个CONNACK消息在一个网络连接上，客户端只能发送一次CONNECT报文。服务端必须将客户端发送的第二个CONNECT报文当作协议违规处理并断开客户端的连接
                    String clientId = ((MqttConnectPayload) mqttMessage.payload()).clientIdentifier();
                    String userName = ((MqttConnectPayload) mqttMessage.payload()).userName();
                    byte[] password = ((MqttConnectPayload) mqttMessage.payload()).passwordInBytes();
                    logger.info("client connected,clientId---{},username---{},ip---{}", clientId, userName, clientIp);
                    if (verifyListener != null) {
                        if (!verifyListener.verify(clientId, userName, password)) {
                            logger.info("invalid mqtt username or password---{},passwordPresent---{}", userName, password != null && password.length > 0);
                            ctx.close();
                            break;
                        }
                    }
                    connack(channel, mqttMessage);
                    if (listener != null) {
                        String uuid = listener.clientIdToUuid(clientId);
                        clientSessionManager.online(clientIp, channel.id().asLongText(), this::publish, uuid, userName, password);
                    }
                    break;
                case PUBLISH:
                    //客户端发布消息 ,PUBACK报文是对QoS 1等级的PUBLISH报文的响应
                    String topic = mqttMessage.variableHeader() instanceof MqttPublishVariableHeader ? ((MqttPublishVariableHeader) mqttMessage.variableHeader()).topicName() : "";

                    String sMsg = mqttMessage.payload() == null ? "receive message，payload is null，maybe big message length" :
                            new String(ByteBufUtil.getBytes((ByteBuf) mqttMessage.payload()), defaultCharset);
                    if(mqttMessage.payload()==null){
                        //特殊情况，需要打印一下
                        logger.info("receive message，payload is null，maybe big message length" );
                    }
                    puback(channel, mqttMessage);
                    try {
                        eventQueue.add(new WrapMqttMessage(clientIp, channel.id().asLongText(), topic, sMsg, this::publish));
                    } catch (IllegalStateException exception) {
                        logger.error("message add failed", exception);
                    }
                    break;
                case PUBREL:
                    //	发布释放,PUBREL报文是对PUBREC报文的响应
                    pubcomp(channel, mqttMessage);
                    break;
                case SUBSCRIBE:
                    //	客户端订阅主题,客户端向服务端发送SUBSCRIBE报文用于创建一个或多个订阅，每个订阅注册客户端关心的一个或多个主题。为了将应用消息转发给与那些订阅匹配的主题，服务端发送PUBLISH报文给客户端。SUBSCRIBE报文也（为每个订阅）指定了最大的QoS等级，服务端根据这个发送应用消息给客户端
                    suback(channel, mqttMessage);
                    break;
                case UNSUBSCRIBE:
                    //	客户端取消订阅,客户端发送UNSUBSCRIBE报文给服务端，用于取消订阅主题
                    unsuback(channel, mqttMessage);
                    break;
                case PINGREQ:
                    //	客户端发起心跳,客户端发送PINGREQ报文给服务端的,在没有任何其它控制报文从客户端发给服务的时，告知服务端客户端还活着，请求服务端发送 响应确认它还活着，使用网络以确认网络连接没有断开
                    pingresp(channel, mqttMessage);
                    break;
                case DISCONNECT:
                    //	客户端主动断开连接,DISCONNECT报文是客户端发给服务端的最后一个控制报文， 服务端必须验证所有的保留位都被设置为0
                    ctx.close();
                    break;
                default:
                    break;
            }
        } catch (Exception e) {
            logger.error("channel read failed", e);
        } finally {
            ReferenceCountUtil.release(msg);
        }
    }

    /**
     * 从客户端收到新的数据、读取完成时调用
     */
    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) {
        //logger.info("MQTT channelReadComplete:{}", ctx.channel().id().asLongText());
    }

    /**
     * 当出现 Throwable 对象才会被调用，即当 Netty 由于 IO 错误或者处理器在处理事件时抛出的异常时
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        // super.exceptionCaught(ctx, cause); 注释是为了解决：远程主机强迫关闭了一个现有的连接 错误，
        logger.error("MQTT Server exception,{}:{}", ctx.channel().id().asLongText(), cause.getMessage());
        ctx.close();
    }

    /**
     * 客户端与服务端第一次建立连接时执行
     */
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        super.channelActive(ctx);
        //logger.info("MQTT channelActive:{}", ctx.channel().id().asLongText());
        channelMap.put(ctx.channel().id().asLongText(), ctx.channel());
    }

    /**
     * 客户端与服务端 断连时执行
     */
    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        super.channelInactive(ctx);
        //某些特殊的情况(设备修改mqtt地址，然后重启)，不会超时也不会异常，直接inactive。所以重复执行ctx.close
        ctx.close();
        String channelId = ctx.channel().id().asLongText();
        logger.info("MQTT channelInactive:{}", channelId);
        channelMap.remove(channelId);
        clientSessionManager.offline(channelId);
    }

    /**
     * 服务端 当读超时时 会调用这个方法，SSL的时候也会触发SslCloseCompletionEvent，SslHandshakeCompletionEvent
     */
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        super.userEventTriggered(ctx, evt);
        logger.info("MQTT Server Channel Event:{},{}", ctx.channel().id().asLongText(), evt.toString());
        if (evt instanceof IdleStateEvent) {
            ctx.close();
        }
    }


    @Override
    public void channelWritabilityChanged(ChannelHandlerContext ctx) throws Exception {
        super.channelWritabilityChanged(ctx);
        //logger.info("MQTT channelWritabilityChanged:{}", ctx.channel().id().asLongText());
    }

    /**
     * 发送消息给客户端，需传递channel的id，主题和内容
     */
    public boolean publish(CustomMqttPublishMessage mqttPublishMessage) {
        if (mqttPublishMessage == null || mqttPublishMessage.isEmpty()) {
            logger.error("MQTT channel or topic or content must not be null");
            return false;
        }
        String channelId = mqttPublishMessage.getChannelId();
        if (!channelMap.containsKey(channelId)) {
            logger.error("not found mqtt channel id={},publish failed", channelId);
            return false;
        }
        Channel channel = channelMap.get(channelId);
        MqttPublishVariableHeader header = new MqttPublishVariableHeader(mqttPublishMessage.getTopic(), -1);
        ByteBuf payload = channel.alloc().buffer();
        byte[] bytes = mqttPublishMessage.getContent().getBytes(defaultCharset);
        payload.writeBytes(bytes);
        MqttFixedHeader mqttFixedHeader = new MqttFixedHeader(MqttMessageType.PUBLISH, false, MqttQoS.AT_MOST_ONCE, false,
                bytes.length + 5);
        channel.writeAndFlush(new MqttPublishMessage(mqttFixedHeader, header, payload));
        return true;
    }

    //------------------------------分割-----------------------------------------------------------------

    /**
     * 确认连接请求
     */
    private void connack(Channel channel, MqttMessage mqttMessage) {
        MqttConnectMessage mqttConnectMessage = (MqttConnectMessage) mqttMessage;
        MqttFixedHeader mqttFixedHeaderInfo = mqttConnectMessage.fixedHeader();
        MqttConnectVariableHeader mqttConnectVariableHeaderInfo = mqttConnectMessage.variableHeader();
        //	构建返回报文， 可变报头
        MqttConnAckVariableHeader mqttConnAckVariableHeaderBack = new MqttConnAckVariableHeader(MqttConnectReturnCode.CONNECTION_ACCEPTED, mqttConnectVariableHeaderInfo.isCleanSession());
        //	构建返回报文， 固定报头
        MqttFixedHeader mqttFixedHeaderBack = new MqttFixedHeader(MqttMessageType.CONNACK, mqttFixedHeaderInfo.isDup(), MqttQoS.AT_MOST_ONCE, mqttFixedHeaderInfo.isRetain(), 0x02);
        //	构建CONNACK消息体
        MqttConnAckMessage connAck = new MqttConnAckMessage(mqttFixedHeaderBack, mqttConnAckVariableHeaderBack);
        //logger.info("connack--"+connAck.toString());
        channel.writeAndFlush(connAck);
    }

    /**
     * 发布完成 qos2
     */
    private void pubcomp(Channel channel, MqttMessage mqttMessage) {
        MqttMessageIdVariableHeader messageIdVariableHeader = (MqttMessageIdVariableHeader) mqttMessage.variableHeader();
        //	构建返回报文， 固定报头
        MqttFixedHeader mqttFixedHeaderBack = new MqttFixedHeader(MqttMessageType.PUBCOMP, false, MqttQoS.AT_MOST_ONCE, false, 0x02);
        //	构建返回报文， 可变报头
        MqttMessageIdVariableHeader mqttMessageIdVariableHeaderBack = MqttMessageIdVariableHeader.from(messageIdVariableHeader.messageId());
        MqttMessage mqttMessageBack = new MqttMessage(mqttFixedHeaderBack, mqttMessageIdVariableHeaderBack);
        //logger.info("pubcomp--" + mqttMessageBack.toString());
        channel.writeAndFlush(mqttMessageBack);
    }

    /**
     * 根据qos发布确认
     */
    private void puback(Channel channel, MqttMessage mqttMessage) {
        MqttPublishMessage mqttPublishMessage = (MqttPublishMessage) mqttMessage;
        MqttFixedHeader mqttFixedHeaderInfo = mqttPublishMessage.fixedHeader();
        MqttQoS qos = mqttFixedHeaderInfo.qosLevel();
        byte[] headBytes = new byte[mqttPublishMessage.payload().readableBytes()];
        mqttPublishMessage.payload().readBytes(headBytes);

        switch (qos) {
            //	至多一次
            case AT_MOST_ONCE:
                break;
            //	至少一次
            case AT_LEAST_ONCE:
                //	构建返回报文， 可变报头
                MqttMessageIdVariableHeader mqttMessageIdVariableHeaderBack = MqttMessageIdVariableHeader.from(mqttPublishMessage.variableHeader().packetId());
                //	构建返回报文， 固定报头
                MqttFixedHeader mqttFixedHeaderBack = new MqttFixedHeader(MqttMessageType.PUBACK, mqttFixedHeaderInfo.isDup(), MqttQoS.AT_MOST_ONCE, mqttFixedHeaderInfo.isRetain(), 0x02);
                //	构建PUBACK消息体
                MqttPubAckMessage pubAck = new MqttPubAckMessage(mqttFixedHeaderBack, mqttMessageIdVariableHeaderBack);
                //logger.info("AT_LEAST_ONCE puback--" + pubAck.toString());
                channel.writeAndFlush(pubAck);
                break;
            //	刚好一次
            case EXACTLY_ONCE:
                //	构建返回报文， 固定报头
                MqttFixedHeader mqttFixedHeaderBack2 = new MqttFixedHeader(MqttMessageType.PUBREC, false, MqttQoS.AT_LEAST_ONCE, false, 0x02);
                //	构建返回报文， 可变报头
                MqttMessageIdVariableHeader mqttMessageIdVariableHeaderBack2 = MqttMessageIdVariableHeader.from(mqttPublishMessage.variableHeader().packetId());
                MqttMessage mqttMessageBack = new MqttMessage(mqttFixedHeaderBack2, mqttMessageIdVariableHeaderBack2);
                //logger.info("EXACTLY_ONCE puback--" + mqttMessageBack.toString());
                channel.writeAndFlush(mqttMessageBack);
                break;
            default:
                break;
        }
    }

    /**
     * 订阅确认
     */
    private void suback(Channel channel, MqttMessage mqttMessage) {
        MqttSubscribeMessage mqttSubscribeMessage = (MqttSubscribeMessage) mqttMessage;
        MqttMessageIdVariableHeader messageIdVariableHeader = mqttSubscribeMessage.variableHeader();
        //	构建返回报文， 可变报头
        MqttMessageIdVariableHeader variableHeaderBack = MqttMessageIdVariableHeader.from(messageIdVariableHeader.messageId());
        Set<String> topics = mqttSubscribeMessage.payload().topicSubscriptions().stream().map(MqttTopicSubscription::topicName).collect(Collectors.toSet());
        //logger.info(topics.toString());
        List<Integer> grantedQosLevels = new ArrayList<>(topics.size());
        for (int i = 0; i < topics.size(); i++) {
            grantedQosLevels.add(mqttSubscribeMessage.payload().topicSubscriptions().get(i).qualityOfService().value());
        }
        //	构建返回报文	有效负载
        MqttSubAckPayload payloadBack = new MqttSubAckPayload(grantedQosLevels);
        //	构建返回报文	固定报头
        MqttFixedHeader mqttFixedHeaderBack = new MqttFixedHeader(MqttMessageType.SUBACK, false, MqttQoS.AT_MOST_ONCE, false, 2 + topics.size());
        //	构建返回报文	订阅确认
        MqttSubAckMessage subAck = new MqttSubAckMessage(mqttFixedHeaderBack, variableHeaderBack, payloadBack);
        //logger.info("suback--"+subAck.toString());
        channel.writeAndFlush(subAck);
    }

    /**
     * 取消订阅确认
     */
    private void unsuback(Channel channel, MqttMessage mqttMessage) {
        MqttMessageIdVariableHeader messageIdVariableHeader = (MqttMessageIdVariableHeader) mqttMessage.variableHeader();
        //	构建返回报文	可变报头
        MqttMessageIdVariableHeader variableHeaderBack = MqttMessageIdVariableHeader.from(messageIdVariableHeader.messageId());
        //	构建返回报文	固定报头
        MqttFixedHeader mqttFixedHeaderBack = new MqttFixedHeader(MqttMessageType.UNSUBACK, false, MqttQoS.AT_MOST_ONCE, false, 2);
        //	构建返回报文	取消订阅确认
        MqttUnsubAckMessage unSubAck = new MqttUnsubAckMessage(mqttFixedHeaderBack, variableHeaderBack);
        //logger.info("unsuback--" + unSubAck.toString());
        channel.writeAndFlush(unSubAck);
    }

    /**
     * 心跳响应
     */
    private void pingresp(Channel channel, MqttMessage mqttMessage) {
        //	心跳响应报文	11010000 00000000  固定报文
        MqttFixedHeader fixedHeader = new MqttFixedHeader(MqttMessageType.PINGRESP, false, MqttQoS.AT_MOST_ONCE, false, 0);
        MqttMessage mqttMessageBack = new MqttMessage(fixedHeader);
        //logger.info("pingresp--" + mqttMessageBack.toString());
        channel.writeAndFlush(mqttMessageBack);
    }
}
