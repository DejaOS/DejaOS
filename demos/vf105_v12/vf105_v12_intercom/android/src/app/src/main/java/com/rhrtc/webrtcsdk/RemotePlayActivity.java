package com.rhrtc.webrtcsdk;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatSeekBar;
import androidx.core.app.ActivityCompat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.SimpleAdapter;
import android.widget.Toast;

import com.rhrtc.webrtc.AppRTCAudioManager;
import com.rhrtc.webrtc.PeerConnectionClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RendererCommon;
import org.webrtc.SessionDescription;
import org.webrtc.StatsReport;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoCapturer;
import org.webrtc.VideoFrame;
import org.webrtc.VideoSink;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class RemotePlayActivity extends AppCompatActivity implements WebSocketMsgCallback,PeerConnectionClient.PeerConnectionEvents{
    private static final String TAG = "RemotePlayActivity";
    public String ownid;
    public String peerid;
    public String sessionId;
    private String iceserver;
    private SimpleAdapter adapter;
    private ListView listView;
    private boolean isUseDataChennel = true;
    private static final int REQUEST_CODE = 1;
    private long callStartedTimeMs;
    private ArrayList<HashMap<String, Object>> list = new ArrayList<>();
    private ProgressBar progressBar;
    public EglBase eglBase = null;
    private AppCompatSeekBar mSeekBar;
    private AppRTCAudioManager audioManager;
    private SurfaceViewRenderer pipRenderer;
    private PeerConnectionClient peerConnectionClient;
    private PeerConnectionClient.PeerConnectionParameters peerConnectionParameters;
    private PeerConnectionClient.SignalingParameters signalingParameters;
    private static class ProxyVideoSink implements VideoSink {
        private VideoSink target;

        @Override
        synchronized public void onFrame(VideoFrame frame) {
            if (target == null) {
                // Logging.d(TAG, "Dropping frame in proxy because target is null.");
                return;
            }

            target.onFrame(frame);
        }

        synchronized public void setTarget(VideoSink target) {
            this.target = target;
        }
    }
    private final ProxyVideoSink remoteProxyRenderer = new ProxyVideoSink();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_remote_play);
        sessionId = UUID.randomUUID().toString();
        progressBar = findViewById(R.id.progressbar);
        progressBar.setVisibility(View.GONE);

        pipRenderer = findViewById(R.id.video_view);
        eglBase = EglBase.create();
        pipRenderer.init(eglBase.getEglBaseContext(), null);
        pipRenderer.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FIT);
        remoteProxyRenderer.setTarget(pipRenderer);

        List<PeerConnection.IceServer> icelist = new ArrayList<>();
        List<IceCandidate> icecandidata = new ArrayList<>();
        SessionDescription offerSdp = null;
        signalingParameters= new PeerConnectionClient.SignalingParameters(icelist,false,peerid,offerSdp,icecandidata);
        CreatePeerConnection();
        adapter = new SimpleAdapter(this, list, R.layout.list_row_items, new String[]{"snapshot","filename"}, new int[]{ R.id.imageView,R.id.textView});
        listView = (ListView) findViewById(R.id.listview);
        listView.setAdapter(adapter);
        adapter.setViewBinder(new SimpleAdapter.ViewBinder() {
            @Override
            public boolean setViewValue(View view, Object data, String textRepresentation) {
                if (view instanceof ImageView && data instanceof Bitmap) {
                    ImageView iv = (ImageView) view;
                    iv.setImageBitmap((Bitmap) data);
                    return true;
                } else
                    return false;
            }
        });
        listView.setOnItemClickListener(new ListView.OnItemClickListener(){
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                // Log.e("onItemClick", "-----------------------------position   "+position);
                Map<String, Object> item = list.get(position);
                if(item!=null){
                    String filename =   item.get("filename").toString();
                    _send_remote_play_open_msg(filename);
                    // Log.e("onItemClick", "-----------------------------filename   "+filename);
                }
            }
        });

        mSeekBar = findViewById(R.id.sb_seekbar);
        mSeekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int i, boolean b) {
                _send_remote_play_seek_msg(seekBar.getProgress());
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                // Toast.makeText(DownLoadActivity.this, seekBar.getProgress() + "", Toast.LENGTH_SHORT).show();
            }
        });


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
        if (Build.VERSION.SDK_INT >= 23) {
            System.out.println("Correct Android version");
            checkPermission();
        } else {
            System.out.println("Android version too low");
        }
        sessionId = UUID.randomUUID().toString();
        APPAplication apl= (APPAplication) getApplication();
        apl.AddWebSocketListener(this);
        ownid = apl.ownid;
        peerid =  apl.peerid;
        if(apl.WebSocketIsOpen()){
            Singlesendconnectto();
        }

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
                getApplicationContext(), eglBase, peerConnectionParameters, RemotePlayActivity.this);
        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        if(peerConnectionClient!= null) {
            peerConnectionClient.createPeerConnectionFactory(options);
        }

        audioManager = AppRTCAudioManager.create(getApplicationContext());
        // Store existing audio settings and change audio mode to
        // MODE_IN_COMMUNICATION for best possible VoIP performance.
        Log.d(TAG, "Starting the audio manager...");
        audioManager.start(new AppRTCAudioManager.AudioManagerEvents() {
            // This method will be called each time the number of available audio
            // devices has changed.
            @Override
            public void onAudioDeviceChanged(
                    AppRTCAudioManager.AudioDevice audioDevice, Set<AppRTCAudioManager.AudioDevice> availableAudioDevices) {
                onAudioManagerDevicesChanged(audioDevice, availableAudioDevices);
            }
        });

    }
    @Override
    protected void onDestroy (){
        SinglesendDisconnect();
        remoteProxyRenderer.setTarget(null);
        if(peerConnectionClient!= null){
            if(peerConnectionClient.isRecording()){
                peerConnectionClient.stopRecord();
            }
            peerConnectionClient.close();
            peerConnectionClient = null;
        }
        if (pipRenderer != null) {
            pipRenderer.release();
            pipRenderer = null;
        }
        if(audioManager!= null){
            audioManager.stop();
            audioManager = null;
        }

        signalingParameters = null;

        APPAplication apl= (APPAplication) getApplication();
        apl.RemoveWebSocketListener(this);
        super.onDestroy();
    }
    private void onAudioManagerDevicesChanged(
            final AppRTCAudioManager.AudioDevice device, final Set<AppRTCAudioManager.AudioDevice> availableDevices) {
        Log.d(TAG, "onAudioManagerDevicesChanged: " + availableDevices + ", selected: " + device);
        // TODO(henrika): add callback handler.
    }
    private void OnBack() {
        setResult(RESULT_OK);
        finish();
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
        Log.d(TAG, "SinglesendCall");
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
                    lan2.put("mode", "play");
                    lan2.put("source", "");
                    lan2.put("iceservers", iceserver);
                    lan2.put("user", "admin");
                    lan2.put("pwd", "123456");
                    lan2.put("audio", "sendrecv");
                    lan2.put("video", "recvonly");
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
        Log.d(TAG, "handleCreate iceServers= "+iceServers);
        iceserver = iceServers;

        // String iceServer = "{'iceServers': [{'urls': 'stun:stun.l.google.com:19302?transport=udp'}, {'urls': 'turn:numb.viagenie.ca','username': 'webrtc@live.com','credential': 'muazkh'}]}";
        List<PeerConnection.IceServer>  icelist = IceServersFromPCConfigJSON(iceServers);

        signalingParameters.iceServers = icelist;
        VideoCapturer videoCapturer = null;
        if (peerConnectionParameters.videoCallEnabled) {
            // videoCapturer = createVideoCapturer();
        }
        peerConnectionClient.createPeerConnection(
                null, remoteProxyRenderer, videoCapturer, signalingParameters);

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
        Log.d(TAG, "Received ICE candidate " + candidate.sdp);
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

        Log.d(TAG, "Received remote SDP  sdp = " + sdp.type.toString());
        // Log.d(TAG, "Received remote SDP  sdp =" + sdp.description);

        final long delta = System.currentTimeMillis() - callStartedTimeMs;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (peerConnectionClient == null) {
                    Log.e(TAG, "Received remote SDP for non-initialized peer connection.");
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
                    // Log.e("JWebSClientService", "eventName = " +eventName);
                }else{

                }

            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void OnWebSocketState(int state) {

    }

    @Override
    public void onLocalDescription(SessionDescription sdp) {
        Log.d(TAG, "onLocalDescription: sdptyppe = " + sdp.type.toString());
        // Log.d(TAG, "onLocalDescription: sdp = " + sdp.description);
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
        // Log.e(TAG, "onIceCandidate: sdpMLineIndex  =" +candidate.sdpMLineIndex);
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
        Log.e(TAG, "onConnected: " );
        final long delta = System.currentTimeMillis() - callStartedTimeMs;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {



            }
        });
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
        // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

        try {
            JSONObject obj = new JSONObject(msg);
            if(obj!= null){
                String eventName = obj.getString("eventName");
                JSONObject data = obj.getJSONObject("data");
                String session = data.getString("sessionId");
                if(session.equals(sessionId)){
                    if(eventName.equals("_play")){
                        JSONObject message = data.getJSONObject("message");
                        if(message!= null) {

                            JSONArray  responseArray = message.getJSONArray("response");
                            for(int i=0;i<responseArray.length();i++){
                                JSONObject  jsonObject  =  responseArray.getJSONObject(i) ;

                                if( jsonObject.has("getfilelist")){
                                    JSONObject  jsongetfilelist  =  jsonObject.getJSONObject("getfilelist");
                                    JSONArray  filelistsArray = jsongetfilelist.getJSONArray("filelists");
                                    for(int j=0;j<filelistsArray.length();j++){
                                        JSONObject  jsonfilelist  =  filelistsArray.getJSONObject(j) ;
                                        String  filename  =  jsonfilelist.getString("filename");
                                        String snapshot =  jsonfilelist.getString("snapshot");

                                        snapshot = snapshot.split(",")[1];

                                        byte[] decodedString = Base64.decode(snapshot, Base64.DEFAULT);
                                        Bitmap decodedByte = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

                                        HashMap<String, Object> map = new HashMap<>();
                                        map.put("filename", filename);
                                        map.put("snapshot", decodedByte);

                                        runOnUiThread(new Runnable() {
                                            @Override
                                            public void run() {
                                                list.add(map);
                                                adapter.notifyDataSetChanged();
                                            }
                                        });

                                        // list.add(map);

                                        // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>-  = " + snapshot);

                                    }

                                }else if( jsonObject.has("open")){
                                    _send_remote_play_play_msg();
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("start")){
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("currentstate")){
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);
                                    JSONObject  jsongcurrentstate  =  jsonObject.getJSONObject("currentstate");
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>> = " + jsonObject.toString());
                                    JSONObject position = jsongcurrentstate.getJSONObject("position");
                                    if(position!= null) {

                                        mSeekBar.setProgress(position.getInt("current"));
                                    }

                                }else if( jsonObject.has("pause")){
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);

                                }else if( jsonObject.has("stop")){
                                    // Log.e(TAG, "onDataChennelRecvText:------------>>>>>>>>>>>>>>>>>>- msg = " + msg);
                                    mSeekBar.setProgress(0);

                                }

                            }
                        }

                    }else{

                    }
                    Log.d(TAG, "WSS->C: " + msg);
                    // Log.e("JWebSClientService", "eventName = " +eventName);
                }else{

                }

            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }
    @Override
    public void onDataChennelRecvRaw(int mId, byte[] bytes) {

    }

    @Override
    public void onDataChennelState(int mId, String state) {
        Log.d(TAG, "onDataChennelState: state = " + state);
        if(state == "open"){
            _send_getfilelists_msg();
        }
    }

    private void checkPermission() {

        List<String> deniedPermissionList = new ArrayList<>();
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            // If the permission has not been granted
            Log.d(TAG, "No camera permission, requesting...");
            // ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERM_CODE);
            deniedPermissionList.add(Manifest.permission.CAMERA);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            // If the permission has not been granted
            Log.d(TAG, "No audio permission, requesting...");
            deniedPermissionList.add(Manifest.permission.RECORD_AUDIO);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // If the permission has not been granted
            Log.d(TAG, "No location permission, requesting...");
            deniedPermissionList.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            // If the permission has not been granted
            Log.d(TAG, "No storage permission, requesting...");
            deniedPermissionList.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }


        if (!deniedPermissionList.isEmpty()) {
            ActivityCompat.requestPermissions(this, deniedPermissionList.toArray(new String[0]), REQUEST_CODE);
        }

    }
    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           String permissions[], int[] grantResults) {

        switch (requestCode) {
            // Permission request result returned
            case REQUEST_CODE: {
                if (grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    // Authorized
                    Toast.makeText(this, "Authorization successful!", Toast.LENGTH_SHORT).show();
                } else {
                    // Not authorized
                    // Toast.makeText(this, "Authorization denied!", Toast.LENGTH_SHORT).show();
                }
            }
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    protected void _send_getfilelists_msg() {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__play");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();
            JSONObject getfilelist = new JSONObject();
            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("starttime", "2022-08-31 00:00:00");
            oject.put("endtime", "2022-08-31 23:59:00");

            getfilelist.put("getfilelist", oject);

            requestarray.put(getfilelist);
            message.put("request",requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if(peerConnectionClient!=null) {
                // Log.d(TAG, "_send_getfilelists_msg: state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }

        } catch (JSONException e) {
            Log.e(TAG,"WebSocket register JSON error: " + e.getMessage());
        }

    }
    protected void _send_remote_play_open_msg(String file) {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__play");
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
                // Log.d(TAG, "_send_getfilelists_msg: state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }

        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }
    }
    protected void _send_remote_play_play_msg() {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__play");
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
                // Log.d(TAG, "_send_getfilelists_msg: state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }

        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }
    }

    protected void _send_remote_play_seek_msg(int index) {

        JSONObject json = new JSONObject();

        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__play");
            JSONObject lan2 = new JSONObject();
            lan2.put("sessionId", sessionId);
            lan2.put("sessionType", "app");
            lan2.put("messageId", messageId);
            lan2.put("from", ownid);
            lan2.put("to", peerid);
            JSONObject message = new JSONObject();

            JSONArray requestarray = new JSONArray();
            JSONObject oject = new JSONObject();
            oject.put("seek", index);

            requestarray.put(oject);
            message.put("request", requestarray);
            lan2.put("message", message);
            json.put("data", lan2);
            if (peerConnectionClient != null) {
                // Log.d(TAG, "_send_getfilelists_msg: state = " + json.toString());
                peerConnectionClient.DataChannelSendText(json.toString());
            }

        } catch (JSONException e) {
            Log.e(TAG, "WebSocket register JSON error: " + e.getMessage());
        }

    }

}