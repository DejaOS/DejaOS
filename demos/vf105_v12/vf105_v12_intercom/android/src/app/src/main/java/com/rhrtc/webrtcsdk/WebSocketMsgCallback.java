package com.rhrtc.webrtcsdk;

public interface WebSocketMsgCallback {

    void OnWebSocketMessage(String msg);
    void OnWebSocketState(int  state);

}
