package com.rhrtc.webrtc;

import android.os.Environment;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;

public class FileDumper {
    private FileOutputStream fos;
    private String path;

    public FileDumper() {
    }

    public void init(String name) {
        try {
            path = Environment.getExternalStorageDirectory().getPath() + File.separator + name;
            fos = new FileOutputStream(path);
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }
    }

    public void write(ByteBuffer byteBuffer) {
        byteBuffer.rewind();
        byte[] data = new byte[byteBuffer.limit()];
        byteBuffer.get(data);
        try {
            fos.write(data);
        } catch (IOException e) {
            e.printStackTrace();
        }
        byteBuffer.rewind();
    }

    public void write(ByteBuffer byteBuffer, int position, int size) {
        byteBuffer.position(position);
        byte[] data = new byte[size];
        byteBuffer.get(data);
        try {
            fos.write(data);
        } catch (IOException e) {
            e.printStackTrace();
        }
        byteBuffer.position(position);
    }

    public void write(byte[] bytes) {
        try {
            fos.write(bytes);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void release() {
        try {
            fos.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        File file = new File(path);
        if (!file.exists())
            return;
        if (file.length() < 1024) {
            file.delete();
        }
    }
}
