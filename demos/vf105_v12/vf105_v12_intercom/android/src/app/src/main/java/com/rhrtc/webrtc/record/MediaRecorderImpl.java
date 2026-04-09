package com.rhrtc.webrtc.record;

import android.graphics.Bitmap;
import android.util.Log;

import com.rhrtc.webrtc.utils.EglUtils;

import org.webrtc.IceCandidate;
import org.webrtc.SessionDescription;
import org.webrtc.StatsReport;
import org.webrtc.VideoTrack;

import java.io.File;
import java.nio.ByteBuffer;





public class MediaRecorderImpl {

    private final Integer id;
    private final VideoTrack videoTrack;
    private final AudioSamplesInterceptor audioInterceptor;
    private VideoFileRenderer videoFileRenderer;
    private boolean isRunning = false;
    private File recordFile;

    public MediaRecorderImpl(Integer id, VideoTrack videoTrack, AudioSamplesInterceptor audioInterceptor) {
        this.id = id;
        this.videoTrack = videoTrack;
        this.audioInterceptor = audioInterceptor;

    }
    public void InputBitmap(Bitmap source){
        if (!isRunning)
            return;
         if(videoFileRenderer!=null){
             videoFileRenderer.InputBitmap(source);
         }
    }
    public void startRecording(File file) throws Exception {
        //Log.e(TAG, "startRecording  -----------------------------------------------");

        if (isRunning)
            return;
        recordFile = file;
        isRunning = true;
        //noinspection ResultOfMethodCallIgnored
        file.getParentFile().mkdirs();
        if (videoTrack != null) {
            videoFileRenderer = new VideoFileRenderer(
                file.getAbsolutePath(),
                EglUtils.getRootEglBaseContext(),
                audioInterceptor != null
            );
           
            videoTrack.addSink(videoFileRenderer);
            if (audioInterceptor != null) {
                audioInterceptor.attachCallback(id, videoFileRenderer);
            }
        } else {
            Log.e(TAG, "Video track is null");
            if (audioInterceptor != null) {
                //TODO(rostopira): audio only recording
                videoFileRenderer = new VideoFileRenderer(
                        file.getAbsolutePath(),
                        EglUtils.getRootEglBaseContext(),
                        audioInterceptor != null
                );
                if (audioInterceptor != null) {
                    audioInterceptor.attachCallback(id, videoFileRenderer);
                }
            }
        }
    }

    public File getRecordFile() { return recordFile; }

    public void stopRecording() {
        isRunning = false;
        if (audioInterceptor != null)
            audioInterceptor.detachCallback(id);
        if (videoTrack != null && videoFileRenderer != null) {
            videoTrack.removeSink(videoFileRenderer);

        }
        if(videoFileRenderer!= null){
            videoFileRenderer.release();
            videoFileRenderer = null;
        }
    }

    private static final String TAG = "MediaRecorderImpl";

}
