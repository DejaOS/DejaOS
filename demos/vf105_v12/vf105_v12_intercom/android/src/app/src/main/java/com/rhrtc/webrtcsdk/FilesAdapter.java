package com.rhrtc.webrtcsdk;


import android.content.Context;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.SimpleAdapter;
import android.widget.Toast;



import java.util.List;
import java.util.Map;

public class FilesAdapter extends SimpleAdapter {
    //上下文
    Context context;


    public FilesAdapter(Context context,
                         List<? extends Map<String, ?>> data, int resource, String[] from,
                         int[] to) {
        super(context, data, resource, from, to);
        this.context = context;
      
    }

    @Override
    public View getView(final int i, View convertView, ViewGroup viewGroup) {

       // Log.e("DeviceAdapter::getView", "getView()");
        View view = super.getView(i, convertView, viewGroup);

        return view;
    }
}
