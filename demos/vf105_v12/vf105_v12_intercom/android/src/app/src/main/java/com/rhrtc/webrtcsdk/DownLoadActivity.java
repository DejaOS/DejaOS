package com.rhrtc.webrtcsdk;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatSeekBar;

import com.rhrtc.webrtc.AppRTCAudioManager;
import com.rhrtc.webrtc.PeerConnectionClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.SessionDescription;
import org.webrtc.StatsReport;
import org.webrtc.VideoCapturer;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;


public class DownLoadActivity extends AppCompatActivity implements WebSocketMsgCallback, PeerConnectionClient.PeerConnectionEvents {
    private static final String TAG = "DownLoadActivity";
    public String ownid;
    public String peerid;
    public String sessionId;
    private String iceserver;
    private AppCompatSeekBar mSeekBar;
    private boolean isUseDataChennel = true;
    public EglBase eglBase = null;
    private long callStartedTimeMs;
    private int _filesize = 0;
    private int _recvsize = 0;
    private int _totlesize = 0;
    private int _totle_recvsize = 0;
    private TextView textView;
    private PeerConnectionClient peerConnectionClient;
    private PeerConnectionClient.PeerConnectionParameters peerConnectionParameters;
    private PeerConnectionClient.SignalingParameters signalingParameters;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_down_load);
        sessionId = UUID.randomUUID().toString();
        eglBase = EglBase.create();

        List<PeerConnection.IceServer> icelist = new ArrayList<>();
        List<IceCandidate> icecandidata = new ArrayList<>();
        SessionDescription offerSdp = null;
        signalingParameters= new PeerConnectionClient.SignalingParameters(icelist,false,peerid,offerSdp,icecandidata);
        CreatePeerConnection();

        APPAplication apl = (APPAplication) getApplication();
        apl.AddWebSocketListener(this);
        ownid = apl.ownid;
        peerid = apl.peerid;
        if (apl.WebSocketIsOpen()) {
            Singlesendconnectto();

        }
        textView = findViewById(R.id.textView);
        textView.setText("");
        ImageButton but = findViewById(R.id.imageButton);

        but.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        OnBack();
                    }
                });
            }
        });
        mSeekBar = findViewById(R.id.sb_seekbar);
        mSeekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int i, boolean b) {

            }
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
               // Toast.makeText(DownLoadActivity.this, seekBar.getProgress() + "", Toast.LENGTH_SHORT).show();
            }
        });

    }
    void CreatePeerConnection(){
        PeerConnectionClient.DataChannelParameters dataChannelParameters = null;
        if (isUseDataChennel) {
            dataChannelParameters = new PeerConnectionClient.DataChannelParameters(true,
                    -1,
                    -1,
                    "Subprotocol",
                    false,
                    0);
        }

        peerConnectionParameters =
                new PeerConnectionClient.PeerConnectionParameters(false,
                        false,
                        1024,
                        768,
                        30,
                        1024*1024,
                        "H264 Baseline",
                        true,
                        false,
                        0,
                        "OPUS",
                        false,
                        false,
                        false,
                        false,
                        false,
                        false,
                        false,
                        false,
                        false,
                        dataChannelParameters);


        peerConnectionClient = new PeerConnectionClient(
                getApplicationContext(), eglBase, peerConnectionParameters, DownLoadActivity.this);
        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        if(peerConnectionClient!= null) {
            peerConnectionClient.createPeerConnectionFactory(options);
        }



    }
    private void OnBack() {
        setResult(RESULT_OK);
        finish();
    }
    @Override
    protected void onDestroy() {

        SinglesendDisconnect();
        if(peerConnectionClient!= null){
            peerConnectionClient.close();
            peerConnectionClient = null;
        }
        signalingParameters = null;

        APPAplication apl = (APPAplication) getApplication();
        apl.RemoveWebSocketListener(this);
        super.onDestroy();
    }
    private void Singlesendconnectto() {

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                APPAplication apl= (APPAplication) getApplication();
                JSONObject json = new JSONObject();
                String messageId = UUID.randomUUID().toString();
                try {
                    json.put("eventName", "__connectto");
                    JSONObject lan2 = new JSONObject();
                    lan2.put("sessionId", sessionId);
                    lan2.put("sessionType", "app");
                    lan2.put("messageId", messageId);
                    lan2.put("from", ownid);
                    lan2.put("to", peerid);
                    json.put("data", lan2);

                    Log.d(TAG, "C->WSS: " + json.toString());
                    apl.wsSend(json.toString());

                } catch (JSONException e) {
                    Log.e("JWebSocketClient", "WebSocket register JSON error: " + e.getMessage());

                }


            }
        });

    }
    private void SinglesendCall() {
        Log.d(TAG, " SinglesendCall");
        callStartedTimeMs = System.currentTimeMillis();
        runOnUiThread(new Runnable() {
            @Override
            public void run() {

                APPAplication apl= (APPAplication) getApplication();

                JSONObject json = new JSONObject();
                String messageId = UUID.randomUUID().toString();
                try {
                    json.put("eventName", "__call");
                    JSONObject lan2 = new JSONObject();
                    lan2.put("sessionId", sessionId);
                    lan2.put("sessionType", "app");
                    lan2.put("messageId", messageId);
                    lan2.put("from", ownid);
                    lan2.put("to", peerid);
                    lan2.put("mode", "download");
                    lan2.put("source", "");
                    lan2.put("iceservers", iceserver);
                    lan2.put("user", "admin");
                    lan2.put("pwd", "123456");
                    lan2.put("audio", "false");
                    lan2.put("video", "false");
                    lan2.put("datachannel", "true");
                    json.put("data", lan2);

                    Log.d(TAG, "C->WSS: " + json.toString());
                    apl.wsSend(json.toString());


                } catch (JSONException e) {
                    Log.e("JWebSocketClient", "WebSocket register JSON error: " + e.getMessage());
                }

            }
        });

    }
    private void SinglesendDisconnect(){
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                APPAplication apl= (APPAplication) getApplication();
                JSONObject json = new JSONObject();

                String messageId = UUID.randomUUID().toString();
                try {
                    json.put("eventName", "__disconnected");
                    JSONObject lan2 = new JSONObject();
                    lan2.put("sessionId", sessionId);
                    lan2.put("sessionType", "app");
                    lan2.put("messageId", messageId);
                    lan2.put("from", ownid);
                    lan2.put("to", peerid);
                    json.put("data", lan2);

                    Log.d(TAG, "C->WSS: " + json.toString());
                    apl.wsSend(json.toString());



                } catch (JSONException e) {
                    Log.e(TAG,"WebSocket register JSON error: " + e.getMessage());
                }

            }
        });
    }
    private void handleCreate(String iceServers) throws JSONException {
        Log.d(TAG, "handleCreate    iceServers= "+iceServers);
        iceserver = iceServers;


        //String iceServer = "{'iceServers': [{'urls': 'stun:stun.l.google.com:19302?transport=udp'}, {'urls': 'turn:numb.viagenie.ca','username': 'webrtc@live.com','credential': 'muazkh'}]}";
        List<PeerConnection.IceServer> icelist = IceServersFromPCConfigJSON(iceServers);

        signalingParameters.iceServers = icelist;
        VideoCapturer videoCapturer = null;
        if (peerConnectionParameters.videoCallEnabled) {
            // videoCapturer = createVideoCapturer();
        }
        peerConnectionClient.createPeerConnection(
                null, null, videoCapturer, signalingParameters);

        if (signalingParameters.initiator) {

            Log.d(TAG, "Creating OFFER...");


            peerConnectionClient.createOffer();
        } else {
            if (signalingParameters.offerSdp != null) {
                peerConnectionClient.setRemoteDescription(signalingParameters.offerSdp);
                peerConnectionClient.createAnswer();
            }else{
                SinglesendCall();
            }
            if (signalingParameters.iceCandidates != null) {
                // Add remote ICE candidates from room.
                for (IceCandidate iceCandidate : signalingParameters.iceCandidates) {
                    peerConnectionClient.addRemoteIceCandidate(iceCandidate);
                }
            }
        }



    }
    protected List<PeerConnection.IceServer> IceServersFromPCConfigJSON(String pcConfig) {
        JSONObject json = null;
        List<PeerConnection.IceServer> ret = new ArrayList<>();
        try {
            json = new JSONObject(pcConfig);

            JSONArray servers = json.getJSONArray("iceServers");

            for (int i = 0; i < servers.length(); ++i) {
                JSONObject server = servers.getJSONObject(i);
                String credential = server.has("credential") ? server.getString("credential") : "";
                String username = server.has("username") ? server.getString("username") : "";
                Object object  = server.get("urls");
                if (object instanceof JSONObject) {

                    String url = server.getString("urls");

                    PeerConnection.IceServer turnServer =
                            PeerConnection.IceServer.builder(url)
                                    .setUsername(username)
                                    .setPassword(credential)
                                    .createIceServer();
                    ret.add(turnServer);
                }else if (object instanceof JSONArray) {

                    JSONArray jsonArray = (JSONArray) object;

                    if (jsonArray.length() > 0) {
                        for (int j = 0; j < jsonArray.length(); j++) {
                            Object ob = jsonArray.get(j);
                            if(ob instanceof String) {
                                String url = ob.toString();
                                PeerConnection.IceServer turnServer =
                                        PeerConnection.IceServer.builder(url)
                                                .setUsername(username)
                                                .setPassword(credential)
                                                .createIceServer();
                                ret.add(turnServer);

                            }

                        }

                    }

                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return ret;
    }
    IceCandidate toJavaCandidate(String Candidate) {
        JSONObject json = null;
        IceCandidate ice = null;
        try {
            json = new JSONObject(Candidate);
            // return new IceCandidate(json.getString("sdpMid"), json.getInt("sdpMLineIndex"), json.getString("candidate"));
            return new IceCandidate("0", 0, json.getString("candidate"));
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return ice;
    }
    public void onRemoteIceCandidate(final IceCandidate candidate) {
        Log.d(TAG, "Received ICE candidate "+candidate.sdp);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (peerConnectionClient == null) {
                    Log.e(TAG, "Received ICE candidate for a non-initialized peer connection.");
                    return;
                }
                peerConnectionClient.addRemoteIceCandidate(candidate);
            }
        });
    }
    public void onRemoteDescription(final SessionDescription sdp) {

        Log.d(TAG, "Received remote SDP  sdp =" + sdp.type.toString());
        //Log.d(TAG, "Received remote SDP  sdp =" + sdp.description);

        final long delta = System.currentTimeMillis() - callStartedTimeMs;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (peerConnectionClient == null) {
                    Log.e(TAG, "Received remote SDP for non-initilized peer connection.");
                    return;
                }

                peerConnectionClient.setRemoteDescription(sdp);
                if (!signalingParameters.initiator) {

                    // Create answer. Answer SDP will be sent to offering client in
                    // PeerConnectionEvents.onLocalDescription event.
                    peerConnectionClient.createAnswer();
                }
            }
        });
    }
    @Override
    public void OnWebSocketMessage(String msg) {
        try {
            JSONObject obj = new JSONObject(msg);
            if(obj!= null){
                String eventName = obj.getString("eventName");
                JSONObject data = obj.getJSONObject("data");
                String session = data.getString("sessionId");
                if(session.equals(sessionId)){
                    if(eventName.equals("_create")){
                        String iceServers = data.getString("iceServers");
                        handleCreate(iceServers);

                    }else if(eventName.equals("_offer")){
                        SessionDescription sdp = new SessionDescription(
                                SessionDescription.Type.fromCanonicalForm("offer"), data.getString("sdp"));
                        onRemoteDescription(sdp);

                    }else if(eventName.equals("_answer")){
                        SessionDescription sdp = new SessionDescription(
                                SessionDescription.Type.fromCanonicalForm("answer"), data.getString("sdp"));
                        onRemoteDescription(sdp);

                    }else if(eventName.equals("_ice_candidate")){
                        String szcandidate = data.getString("candidate");
                        if(szcandidate!= null && szcandidate.length()>0) {
                            IceCandidate candidate = toJavaCandidate(szcandidate);
                            if(candidate!= null){
                                onRemoteIceCandidate(candidate);

                            }
                        }

                    }else if(eventName.equals("_session_disconnected")){

                    }else if(eventName.equals("_post_message")){

                    }else if(eventName.equals("_connectinfo")){


                    }else if(eventName.equals("_session_failed")){

                    }else if(eventName.equals("_ping")){

                    }else{

                    }
                    Log.d(TAG, "WSS->C: " + msg);
                    //  Log.e("JWebSClientService", "eventName = " +eventName);
                }else{

                }

            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }
    @Override
    public void OnWebSocketState(int state) {
        if (state == 1) {

        }

    }

    @Override
    public void onLocalDescription(SessionDescription sdp) {
        Log.d(TAG, "onLocalDescription:-------------------------------- sdptyppe = " + sdp.type.toString());
        // Log.d(TAG, "onLocalDescription:-------------------------------- sdp = " + sdp.description);
        final long delta = System.currentTimeMillis() - callStartedTimeMs;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                APPAplication apl= (APPAplication) getApplication();
                if (signalingParameters.initiator) {
                    JSONObject json = new JSONObject();
                    callStartedTimeMs = System.currentTimeMillis();
                    String messageId = UUID.randomUUID().toString();
                    try {
                        json.put("eventName", "__offer");
                        JSONObject lan2 = new JSONObject();
                        lan2.put("sessionId", sessionId);
                        lan2.put("sessionType", "app");
                        lan2.put("messageId", messageId);
                        lan2.put("from", ownid);
                        lan2.put("to", peerid);
                        lan2.put("user", "admin");
                        lan2.put("pwd", "123456");
                        lan2.put("mode", "live");
                        lan2.put("source", "MainStream");
                        lan2.put("type", "offer");
                        lan2.put("sdp", sdp.description);
                        lan2.put("iceservers", iceserver);
                        json.put("data", lan2);

                        Log.d(TAG, "C->WSS: " + json.toString());
                        apl.wsSend(json.toString());


                    } catch (JSONException e) {
                        Log.d(TAG,"WebSocket register JSON error: " + e.getMessage());
                    }
                }else{

                    JSONObject json = new JSONObject();

                    String messageId = UUID.randomUUID().toString();
                    try {
                        json.put("eventName", "__answer");
                        JSONObject lan2 = new JSONObject();
                        lan2.put("sessionId", sessionId);
                        lan2.put("sessionType", "app");
                        lan2.put("messageId", messageId);
                        lan2.put("from", ownid);
                        lan2.put("to", peerid);
                        lan2.put("type", "answer");
                        lan2.put("sdp", sdp.description);
                        json.put("data", lan2);

                        Log.d(TAG, "C->WSS: " + json.toString());
                        apl.wsSend(json.toString());


                    } catch (JSONException e) {
                        Log.d(TAG,"WebSocket register JSON error: " + e.getMessage());
                    }
                }
                if (peerConnectionParameters.videoMaxBitrate > 0) {
                    Log.d(TAG, "Set video maximum bitrate: " + peerConnectionParameters.videoMaxBitrate);
                    peerConnectionClient.setVideoMaxBitrate(peerConnectionParameters.videoMaxBitrate);
                }
            }
        });
    }

    @Override
    public void onIceCandidate(IceCandidate candidate) {
        Log.d(TAG, "onIceCandidate: " +candidate.sdp);
        // Log.e(TAG, "onIceCandidate: sdpMid  =" +candidate.sdpMid);
        //Log.e(TAG, "onIceCandidate: sdpMLineIndex  =" +candidate.sdpMLineIndex);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                APPAplication apl= (APPAplication) getApplication();
                JSONObject json = new JSONObject();

                String messageId = UUID.randomUUID().toString();
                try {
                    json.put("eventName", "__ice_candidate");
                    JSONObject lan2 = new JSONObject();
                    lan2.put("sessionId", sessionId);
                    lan2.put("sessionType", "app");
                    lan2.put("messageId", messageId);
                    lan2.put("from", ownid);
                    lan2.put("to", peerid);
                    lan2.put("label", candidate.sdpMLineIndex);
                    lan2.put("id", candidate.sdpMid);
                    lan2.put("candidate", candidate.sdp);
                    json.put("data", lan2);

                    Log.d(TAG, "C->WSS: " + json.toString());
                    apl.wsSend(json.toString());


                } catch (JSONException e) {
                    Log.e(TAG,"WebSocket register JSON error: " + e.getMessage());
                }


            }
        });
    }

    @Override
    public void onIceCandidatesRemoved(IceCandidate[] candidates) {

    }

    @Override
    public void onIceConnected() {

    }

    @Override
    public void onIceDisconnected() {

    }

    @Override
    public void onConnected() {

    }

    @Override
    public void onDisconnected() {

    }

    @Override
    public void onPeerConnectionClosed() {

    }

    @Override
    public void onPeerConnectionStatsReady(StatsReport[] reports) {

    }

    @Override
    public void onPeerConnectionError(String description) {

    }

    @Override
    public void onPeerConnectionCapture(ByteBuffer nv12, int width, int height) {

    }

    @Override
    public void onDataChennelRecvText(int mId, String msg) {
        try {
            JSONObject obj = new JSONObject(msg);
            if(obj!= null){
                String eventName = obj.getString("eventName");
                JSONObject data = obj.getJSONObject("data");
                String session = data.getString("sessionId");
                if(session.equals(sessionId)){
                    if(eventName.equals("_download")){
                        JSONObject message = data.getJSONObject("message");
                        if(message!= null) {

                            JSONArray  responseArray = message.getJSONArray("response");
                            for(int i=0;i<responseArray.length();i++){
                                JSONObject  jsonObject  =  responseArray.getJSONObject(i) ;

                                if( jsonObject.has("getfilelist")){
                                    JSONObject  jsongetfilelist  =  jsonObject.getJSONObject("getfilelist");
                                    JSONArray  filelistsArray = jsongetfilelist.getJSONArray("filelists");
                                    for(int j=0;j<filelistsArray.length();j++){


                                    }

                                }else if( jsonObject.has("open")){
                                    _send_download_start_msg();
                                    JSONObject  jsongopen  =  jsonObject.getJSONObject("open");
                                    if(jsongopen!= null){
                                        _filesize = jsongopen.getInt("filesize");
                                        _totlesize= _filesize;
                                    }
                                    //Log.d(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("start")){
                                    //Log.d(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("currentstate")){
                                    //Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);
                                    JSONObject  jsongcurrentstate  =  jsonObject.getJSONObject("currentstate");
                                    //Log.e(TAG, "onDataChennelRecvText:------------>>>>> = " + jsonObject.toString());
                                    JSONObject position = jsongcurrentstate.getJSONObject("position");
                                    if(position!= null) {
                                        int filesize = position.getInt("filesize");
                                        int cursize = position.getInt("cursize");

                                        mSeekBar.setProgress(cursize*100/filesize);




                                        //mSeekBar.setProgress(position.getInt("current"));
                                    }

                                }else if( jsonObject.has("pause")){
                                    // Log.d(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("stop")){
                                    //Log.d(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);
                                    mSeekBar.setProgress(0);

                                }

                            }
                        }




                    }else{

                    }
                    Log.d(TAG, "WSS->C: " + msg);
                    //  Log.e("JWebSClientService", "eventName = " +eventName);
                }else{

                }

            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDataChennelRecvRaw(int mId, byte[] bytes) {

        _recvsize += bytes.length;

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                textView.setText(_recvsize+"/"+_filesize);
            }
        });



    }

    @Override
    public void onDataChennelState(int mId, String state) {

        Log.d(TAG, "onDataChennelState:------------>>>>>>>>>>>>>>>>>>- state = " + state);
        if(state == "open"){
            _send_download_open_msg("H264_1080.mp4");
        }


    }
    private void _send_download_open_msg( String file) {
        mSeekBar.setProgress(0);
        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__download");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();

            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("open", file);


            requestarray.put(oject);
            message.put("request", requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if (peerConnectionClient != null) {
                // Log.d(TAG, "_send_getfilelists_msg:-------------------------------- state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }


        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }

    }


    private void _send_download_start_msg() {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__download");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();

            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("start", 0);


            requestarray.put(oject);
            message.put("request", requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if (peerConnectionClient != null) {
                // Log.d(TAG, "_send_getfilelists_msg:-------------------------------- state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }


        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }


    }


    private void _send_download_pause_msg( boolean pause) {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__download");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();

            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("pause", pause);


            requestarray.put(oject);
            message.put("request", requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if (peerConnectionClient != null) {
                // Log.d(TAG, "_send_getfilelists_msg:-------------------------------- state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }


        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }


    }

    private void _send_download_stop_msg() {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__download");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();

            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("stop", "cancel");


            requestarray.put(oject);
            message.put("request", requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if (peerConnectionClient != null) {
                // Log.d(TAG, "_send_getfilelists_msg:-------------------------------- state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }


        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }

    }

}