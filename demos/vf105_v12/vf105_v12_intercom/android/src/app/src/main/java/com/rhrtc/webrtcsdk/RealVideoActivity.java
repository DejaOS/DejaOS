package com.rhrtc.webrtcsdk;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

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

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.rhrtc.webrtc.AppRTCAudioManager.AudioDevice;
import com.rhrtc.webrtc.AppRTCAudioManager.AudioManagerEvents;
import com.rhrtc.webrtc.record.MediaRecorderImpl;
import com.rhrtc.webrtc.utils.RHYuvHelper;

public class RealVideoActivity extends AppCompatActivity implements WebSocketMsgCallback,PeerConnectionClient.PeerConnectionEvents{
    private static final String TAG = "RealVideoActivity";
    private static final int STAT_CALLBACK_PERIOD = 1000;
    public String ownid;
    public String peerid;
    public String sessionId;
    private String iceserver;
    public EglBase eglBase = null;
    private boolean isUseDataChennel = true;
    private boolean ismute = true;
    private boolean isspeek = true;

    private ProgressBar progressBar;
    private long callStartedTimeMs;
    private AppRTCAudioManager audioManager;
    private SurfaceViewRenderer pipRenderer;
    private PeerConnectionClient peerConnectionClient;
    private PeerConnectionClient.PeerConnectionParameters peerConnectionParameters;
    private PeerConnectionClient.SignalingParameters signalingParameters;


    private static final int REQUEST_CODE = 1;
    private static String[] PERMISSIONS_STORAGE = {"android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE"};

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
        setContentView(R.layout.activity_real_video);
        sessionId = UUID.randomUUID().toString();

        pipRenderer = findViewById(R.id.video_view);
        eglBase = EglBase.create();
        pipRenderer.init(eglBase.getEglBaseContext(), null);
        pipRenderer.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FIT);
        remoteProxyRenderer.setTarget(pipRenderer);

        APPAplication apl= (APPAplication) getApplication();
        ownid = apl.ownid;
        peerid =  apl.peerid;
        List<PeerConnection.IceServer> icelist = new ArrayList<>();
        List<IceCandidate> icecandidata = new ArrayList<>();
        SessionDescription offerSdp = null;
        signalingParameters= new PeerConnectionClient.SignalingParameters(icelist,false,peerid,offerSdp,icecandidata);

        CreatePeerConnection();
        progressBar = findViewById(R.id.progressbar);
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

        ImageButton btcapture = findViewById(R.id.button_capture);
        //btcapture.setColorFilter( Color.parseColor("#AE6118"));
        btcapture.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if(peerConnectionClient!= null) {
                    peerConnectionClient.Capture();
                }
            }
        });

        ImageButton btRecord = findViewById(R.id.button_record);
        btRecord.setColorFilter( Color.GRAY);
        btRecord.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if(peerConnectionClient!= null) {
                    if(peerConnectionClient.isRecording()){
                        peerConnectionClient.stopRecord();
                        btRecord.setColorFilter( Color.GRAY);
                    }else {
                        String path = GetFilePathName();
                        peerConnectionClient.startRecord(path);
                        btRecord.setColorFilter( Color.parseColor("#AE6118"));
                    }
                }
            }
        });
        ImageButton btmute = findViewById(R.id.button_mute);

        btmute.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if(peerConnectionClient!= null) {
                    ismute=!ismute;
                    Log.w(TAG,"--------------------------");
                    peerConnectionClient.setAudioEnabled(ismute);
                    if(ismute){
                        btmute.setColorFilter( Color.parseColor("#AE6118"));
                    }else{
                        btmute.setColorFilter( Color.GRAY);
                    }
                }
            }
        });
        ImageButton btspeek = findViewById(R.id.button_speek);

        btspeek.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if(peerConnectionClient!= null) {
                    isspeek=!isspeek;
                    peerConnectionClient.setAudioSpeakEnabled(isspeek);
                    if(isspeek){
                        btspeek.setColorFilter( Color.parseColor("#AE6118"));
                    }else{
                        btspeek.setColorFilter( Color.GRAY);
                    }
                }
            }
        });


        apl.AddWebSocketListener(this);
        if(apl.WebSocketIsOpen()){
            Singlesendconnectto();
        }
        if (Build.VERSION.SDK_INT >= 23) {
            System.out.println("Correct version");
            checkPermission();
        }else {
            System.out.println("Version too low");
        }

    }
    private String GetFilePathName() {
        DateFormat format = new SimpleDateFormat("yyyyMMddHHmmss");
        String bitName = format.format(new Date()) + ".mp4";
        String fileName ;
        if(Build.BRAND .equals("Xiaomi") ){ // Xiaomi
           // fileName = getCacheDir()+bitName;
           fileName = Environment.getExternalStorageDirectory().getPath()+"/DCIM/Camera/"+bitName ;
        }else{ // Meizu, Oppo
            fileName = Environment.getExternalStorageDirectory().getPath()+"/DCIM/"+bitName ;
           // fileName = getCacheDir()+bitName;
        }
        return fileName;
    }
    private void checkPermission() {

        List<String> deniedPermissionList = new ArrayList<>();
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            // If permission is not granted
            Log.d(TAG, "No camera permission, requesting...");
            //ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERM_CODE);
            deniedPermissionList.add(Manifest.permission.CAMERA);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            // If permission is not granted
            Log.d(TAG, "No audio permission, requesting...");
            deniedPermissionList.add(Manifest.permission.RECORD_AUDIO);
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // If permission is not granted
            Log.d(TAG, "No location permission, requesting...");
            deniedPermissionList.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            // If permission is not granted
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
            // Permission request result callback
            case REQUEST_CODE: {
                if (grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    // Authorized
                    Toast.makeText(this, "Authorization succeeded!", Toast.LENGTH_SHORT).show();
                } else {
                    // Not authorized
                    // Toast.makeText(this, "Authorization denied!", Toast.LENGTH_SHORT).show();
                }
            }
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    void CreatePeerConnection(){
        PeerConnectionClient.DataChannelParameters dataChannelParameters = null;
        if (isUseDataChennel) {
            dataChannelParameters = new PeerConnectionClient.DataChannelParameters(true,
                    -1,
                    30,
                    "",
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
                getApplicationContext(), eglBase, peerConnectionParameters, RealVideoActivity.this);
        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        if(peerConnectionClient!= null) {
            peerConnectionClient.createPeerConnectionFactory(options);
        }

        audioManager = AppRTCAudioManager.create(getApplicationContext());
        // Store existing audio settings and change audio mode to
        // MODE_IN_COMMUNICATION for best possible VoIP performance.
        Log.d(TAG, "Starting the audio manager...");
        audioManager.start(new AudioManagerEvents() {
            // This method will be called each time the number of available audio
            // devices has changed.
            @Override
            public void onAudioDeviceChanged(
                    AudioDevice audioDevice, Set<AudioDevice> availableAudioDevices) {
                onAudioManagerDevicesChanged(audioDevice, availableAudioDevices);
            }
        });

    }
    private void OnBack() {
        setResult(RESULT_OK);
        finish();
    }
    private void handleCreate(String iceServers) throws JSONException {
        Log.d(TAG, "handleCreate    iceServers= "+iceServers);
        iceserver = iceServers;


        //String iceServer = "{'iceServers': [{'urls': 'stun:stun.l.google.com:19302?transport=udp'}, {'urls': 'turn:numb.viagenie.ca','username': 'webrtc@live.com','credential': 'muazkh'}]}";
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
    private void onAudioManagerDevicesChanged(
            final AudioDevice device, final Set<AudioDevice> availableDevices) {
        Log.d(TAG, "onAudioManagerDevicesChanged: " + availableDevices + ", "+ "selected: " + device);
        // TODO(henrika): add callback handler.
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
                    lan2.put("mode", "live");
                    lan2.put("source", "MainStream");
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
    private void callConnected() {
        final long delta = System.currentTimeMillis() - callStartedTimeMs;
        Log.i(TAG, "Call connected: delay=" + delta + "ms");
        if (peerConnectionClient == null ) {
            Log.w(TAG, "Call is connected in closed or error state");
            return;
        }
        // Enable statistics callback.
        peerConnectionClient.enableStatsEvents(true, STAT_CALLBACK_PERIOD);
        // setSwappedFeeds(false /* isSwappedFeeds */);
        progressBar.setVisibility(View.GONE);
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
    public void OnWebSocketState(int  state){
        if(state==1){

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

        runOnUiThread(new Runnable() {
            @Override
            public void run() {

                ImageButton btmute = findViewById(R.id.button_mute);
                if(ismute){
                    btmute.setColorFilter( Color.parseColor("#AE6118"));
                }else{
                    btmute.setColorFilter( Color.GRAY);
                }
                ImageButton btspeek = findViewById(R.id.button_speek);
                if(isspeek){
                    btspeek.setColorFilter( Color.parseColor("#AE6118"));
                }else{
                    btspeek.setColorFilter( Color.GRAY);

                }
            }
        });


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
                callConnected();
            }
        });
    }

    @Override
    public void onDisconnected() {
        Log.e(TAG, "onDisconnected: " );
        SinglesendDisconnect();
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
        Bitmap source = RHYuvHelper.NV21ToBitmap(this,nv12.array(),width,height);
        if(source!= null){
            DateFormat format = new SimpleDateFormat("yyyyMMddHHmmss");
            saveBitmap(source,format.format(new Date())+".JPEG");

            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    //ImageView iv_src = (ImageView) findViewById(R.id.imagecapture);
                    //iv_src.setImageBitmap(source);
                    Toast.makeText(RealVideoActivity.this, "Save succeeded",Toast.LENGTH_LONG).show();
                }
            });


        }
    }

    public void saveBitmap(Bitmap bitmap, String bitName){
        String fileName ;
        File file ;
        if(Build.BRAND .equals("Xiaomi") ){ // Xiaomi
            fileName = Environment.getExternalStorageDirectory().getPath()+"/DCIM/Camera/"+bitName ;
        }else{ // Meizu, Oppo
            fileName = Environment.getExternalStorageDirectory().getPath()+"/DCIM/"+bitName ;
        }
        file = new File(fileName);
        if(file.exists()){
            file.delete();
        }
        FileOutputStream out;
        try{
            out = new FileOutputStream(file);
            if(bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out))
            {
                out.flush();
                out.close();
                MediaStore.Images.Media.insertImage(this.getContentResolver(), file.getAbsolutePath(), bitName, null);
            }
        }
        catch (FileNotFoundException e){
            e.printStackTrace();
        }
        catch (IOException e){
            e.printStackTrace();
        }
        this.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.parse("file://" + fileName)));

    }
    @Override
    public void onDataChennelRecvText(int mId, String msg) {

    }

    @Override
    public void onDataChennelRecvRaw(int mId, byte[] bytes) {

    }

    @Override
    public void onDataChennelState(int mId, String state) {

    }
}