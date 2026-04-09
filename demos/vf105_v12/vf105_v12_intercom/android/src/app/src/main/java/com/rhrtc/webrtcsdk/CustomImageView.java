package com.rhrtc.webrtcsdk;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Point;
import android.graphics.Rect;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.widget.ImageView;


import com.rhrtc.webrtc.record.MediaRecorderImpl;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

public class CustomImageView extends androidx.appcompat.widget.AppCompatImageView
{
    private byte[] imagebytes;
    /**
     * @param context
     */
    public CustomImageView(Context context)
    {
        super(context);
        // Todo Auto-generated constructor stub
        setBackgroundColor(0xFFFFFF);
    }

    /**
     * @param context
     * @param attrs
     */
    public CustomImageView(Context context,AttributeSet attrs)
    {
        super(context,attrs);
        // Todo Auto-generated constructor stub
    }

    /**
     * @param context
     * @param attrs
     * @param defStyle
     */
    public CustomImageView(Context context,AttributeSet attrs,int defStyle)
    {
        super(context,attrs,defStyle);
        // Todo Auto-generated constructor stub
    }

    @Override
    protected void onDraw(Canvas canvas)
    {
        // Todo Auto-generated method stub
        Paint paint = new Paint();
        int width = this.getWidth();
        int height = this.getHeight();

        paint.setColor(Color.BLACK);
        canvas.drawRect(0, 0, getMeasuredWidth(), getMeasuredHeight(), paint);
        if(imagebytes!= null) {
            Bitmap bitmap = getPicFromBytes(imagebytes,null);
            bitmap.getWidth();
            ;
            Rect srcRect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
            Rect dstRect = new Rect(0, 0, width, height);
            canvas.drawBitmap(bitmap, srcRect, dstRect, paint);

        }
        super.onDraw(canvas);


    }

    @Override
    public boolean onTouchEvent(MotionEvent event)
    {
        // Todo Auto-generated method stub

        return super.onTouchEvent(event);

    }
    private  Bitmap getPicFromBytes(byte[] bytes,
                                         BitmapFactory.Options opts) {
        if (bytes != null)
            if (opts != null)
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length,
                        opts);
            else
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        return null;
    }
    public void SetImageData(byte[] bytes){
        imagebytes = new byte[bytes.length];
        System.arraycopy(bytes, 0, imagebytes, 0, bytes.length);
        this.invalidate();
    }



}
