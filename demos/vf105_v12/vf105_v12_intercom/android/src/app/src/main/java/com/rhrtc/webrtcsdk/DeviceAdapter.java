package com.rhrtc.webrtcsdk;


import android.content.Context;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.SimpleAdapter;
import android.widget.Toast;

import org.webrtc.RendererCommon;

import java.util.List;
import java.util.Map;

public class DeviceAdapter extends SimpleAdapter {
    // Context
    Context context;
    OnClickEvents eventclick;
    public interface OnClickEvents {
        void onListButonClick(int pos,int id);
    }

    public DeviceAdapter(Context context,
                         List<? extends Map<String, ?>> data, int resource, String[] from,
                         int[] to,OnClickEvents eventclick) {
        super(context, data, resource, from, to);
        this.context = context;
        this.eventclick = eventclick;
    }

    @Override
    public View getView(final int i, View convertView, ViewGroup viewGroup) {

       // Log.e("DeviceAdapter::getView", "getView()");
        View view = super.getView(i, convertView, viewGroup);

        return view;
    }
}
