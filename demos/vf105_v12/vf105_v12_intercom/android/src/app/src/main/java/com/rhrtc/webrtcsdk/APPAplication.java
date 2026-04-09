package com.rhrtc.webrtcsdk;
import android.app.Application;
import android.content.res.Configuration;
import android.util.Log;

import com.rhrtc.webrtc.JWebSocketClient;

import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;

public class APPAplication extends Application {
	private final List<WebSocketMsgCallback> ListCallBack = new ArrayList<>();
	private final List<String> wsSendQueue = new ArrayList<>();
	private JWebSocketClient client_ = null;
	public String ownid;
	public String peerid;
	public String wsurl;
	private boolean websocket_opened = false;

	@Override
	public void onCreate() {
		// Log.d("APPAplication", "onCreate()");
		super.onCreate();
		UUID uuid = UUID.randomUUID();
		ownid = uuid.toString();
		peerid = "KDZN-00-1K4V-HBNJ-00000004";
		wsurl = "ws" + "://webrtc.dxiot.com:8098" + "/wswebclient/" + ownid;
		if (client_ == null) {
			CreateWebSocket();
		}
	}

	@Override
	public void onTerminate() {
		super.onTerminate();

		if (client_ != null) {
			client_.close();
			client_ = null;
		}

		// Called when Application is closed or destroyed
	}

	/*
	 Called when the system configuration changes,
	 such as screen orientation or system language changes.
	 */
	@Override
	public void onConfigurationChanged(Configuration newConfig) {
		super.onConfigurationChanged(newConfig);
	}

	/*
	 Called when system memory is low, used to release memory.
	 */
	@Override
	public void onLowMemory() {
		super.onLowMemory();
	}

	private void CreateWebSocket() {
		Log.d("APPAplication", "CreateWebSocket()");
		URI uri = URI.create(wsurl);
		client_ = new JWebSocketClient(uri) {
			@Override
			public void onMessage(String message) {
				// 'message' is the message received
				// Log.e("JWebSClientService", message);
				try {
					JSONObject obj = new JSONObject(message);
					if (obj != null) {
						String eventName = obj.getString("eventName");
						JSONObject data = obj.getJSONObject("data");
						String to = data.getString("to");
						if (to.equals(ownid)) {
							for (int i = 0; i < ListCallBack.size(); i++) {
								WebSocketMsgCallback callback = ListCallBack.get(i);
								if (callback != null) {
									callback.OnWebSocketMessage(message);
								}
							}
							// Log.e("JWebSClientService", "eventName = " + eventName);
						} else {
							Log.e("JWebSClientService", to + " != " + ownid);
						}
					}
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}

			@Override
			public void onOpen(ServerHandshake handshakedata) {
				Log.d("JWebSocketClient", "onOpen()");
				websocket_opened = true;
				for (int i = 0; i < ListCallBack.size(); i++) {
					WebSocketMsgCallback callback = ListCallBack.get(i);
					if (callback != null) {
						callback.OnWebSocketState(1);
					}
				}
			}

			@Override
			public void onClose(int code, String reason, boolean remote) {
				Log.e("JWebSocketClient", "onClose()   " + reason);
				websocket_opened = false;
				for (int i = 0; i < ListCallBack.size(); i++) {
					WebSocketMsgCallback callback = ListCallBack.get(i);
					if (callback != null) {
						callback.OnWebSocketState(0);
					}
				}
				if (client_ != null) {
					client_.close();
					client_ = null;
				}
				// Reconnect in 5 seconds after connection closes
				Timer timer = new Timer();
				TimerTask task = new TimerTask() {
					@Override
					public void run() {
						CreateWebSocket();
					}
				};
				timer.schedule(task, 5000);
			}

			@Override
			public void onError(Exception ex) {
				websocket_opened = false;
				for (int i = 0; i < ListCallBack.size(); i++) {
					WebSocketMsgCallback callback = ListCallBack.get(i);
					if (callback != null) {
						callback.OnWebSocketState(0);
					}
				}
				if (client_ != null) {
					client_.close();
					client_ = null;
				}
				Log.e("JWebSocketClient", "onError() " + ex.getMessage());
				// Reconnect in 5 seconds after an error
				Timer timer = new Timer();
				TimerTask task = new TimerTask() {
					@Override
					public void run() {
						CreateWebSocket();
					}
				};
				timer.schedule(task, 5000);
			}
		};

		try {
			client_.connectBlocking();
		} catch (InterruptedException e) {
			e.printStackTrace();
			Log.e("JWebSocketClient", "connect error = " + e.getMessage());
		}

	}

	public boolean WebSocketIsOpen() {
		return websocket_opened;
	}

	public void AddWebSocketListener(WebSocketMsgCallback callback) {
		ListCallBack.add(callback);

	}

	public void RemoveWebSocketListener(WebSocketMsgCallback callback) {
		for (int i = 0; i < ListCallBack.size(); i++) {
			if (ListCallBack.get(i) == callback) {
				ListCallBack.remove(i);
			}
		}
	}

	public void wsSend(String data) {
		if (client_ != null && client_.isOpen()) {
			client_.send(data);
		} else {
			wsSendQueue.add(data);
		}
	}
}
