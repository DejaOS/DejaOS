package com.rhrtc.webrtcsdk;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ListView;
import android.widget.SimpleAdapter;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public class MainActivity extends AppCompatActivity implements WebSocketMsgCallback,DeviceAdapter.OnClickEvents {
    private static final String TAG = "MainActivity";
    public String ownid;
    public String peerid;
    public String sessionId;
    private static final int CONNECTION_REQUEST = 1;
    private List<Map<String, Object>> lists;
    private SimpleAdapter adapter;
    private ListView listView;
    private int imageViews_camera_off = R.drawable.ic_camera;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        sessionId = UUID.randomUUID().toString();
        APPAplication apl= (APPAplication) getApplication();
        apl.AddWebSocketListener(this);
        ownid = apl.ownid;
        peerid =  apl.peerid;
        if(apl.WebSocketIsOpen()){
            DeviceSubscribe();
        }

        lists = new ArrayList<>();
        adapter = new DeviceAdapter(MainActivity.this, lists, R.layout.layout_list, new String[]{"image","devicenumber"}, new int[]{R.id.image1,R.id.text2},this);
        listView = (ListView) findViewById(R.id.listview);
        listView.setAdapter(adapter);
        Map<String, Object> map = new HashMap<String, Object>();
        map.put("image", imageViews_camera_off);
        map.put("devicenumber","Real video");
        lists.add(map);


        Map<String, Object> map1 = new HashMap<String, Object>();
        map1.put("image", imageViews_camera_off);
        map1.put("devicenumber","Remote Play");
        lists.add(map1);


        Map<String, Object> map2 = new HashMap<String, Object>();
        map2.put("image", imageViews_camera_off);
        map2.put("devicenumber","Download");
        lists.add(map2);

        Map<String, Object> map3 = new HashMap<String, Object>();
        map3.put("image", imageViews_camera_off);
        map3.put("devicenumber","MJpeg video");
        lists.add(map3);



        listView.setOnItemClickListener(new ListView.OnItemClickListener(){
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
               // Log.d("onItemClick", "-----------------------------position   "+position);
                if(position == 0) {
                    EnterRealVideoActivity();
                }else if(position == 1){
                    EnterRemotePlayActivity();
                }else if(position == 2){
                    EnterDownLoadActivity();
                }else if(position == 3){
                    EnterMjpegActivity();
                }
            }
        });

    }
    private void EnterRealVideoActivity() {
        Intent intent = new Intent(this, RealVideoActivity.class);
        startActivityForResult(intent, CONNECTION_REQUEST);
    }
    private void EnterRemotePlayActivity() {
        Intent intent = new Intent(this, RemotePlayActivity.class);
        startActivityForResult(intent, CONNECTION_REQUEST);
    }
    private void EnterDownLoadActivity() {
        Intent intent = new Intent(this, DownLoadActivity.class);
        startActivityForResult(intent, CONNECTION_REQUEST);
    }
    private void EnterMjpegActivity() {
        Intent intent = new Intent(this, MjpegVideoActivity.class);
        startActivityForResult(intent, CONNECTION_REQUEST);
    }
    @Override
    protected void onDestroy (){
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
                    if(eventName.equals("_subscribe")){

                    }else if(eventName.equals("_login")){

                    }else if(eventName.equals("_logout")){

                    }else if(eventName.equals("_publish")){

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
    public void OnWebSocketState(int  state){
        if(state==1){
            DeviceSubscribe();
        }

    }
    protected void DeviceSubscribe(){
        APPAplication apl= (APPAplication) getApplication();
        JSONObject json = new JSONObject();
        String messageId = UUID.randomUUID().toString();
        try {
            json.put("eventName", "__subscribe");
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

    @Override
    public void onListButonClick(int pos, int id) {

    }
}