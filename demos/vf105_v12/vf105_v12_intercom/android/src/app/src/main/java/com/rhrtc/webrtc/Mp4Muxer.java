package com.rhrtc.webrtc;

import android.media.MediaCodec;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.util.Log;

import java.io.IOException;
import java.nio.ByteBuffer;

public class Mp4Muxer implements MediaEncoderWrapper.EncoderCallback {
    private static final String TAG = "Mp4Muxer";
    private MediaMuxer mediaMuxer;
    private boolean isInited = false;
    private boolean isRunning = false;
    private int audioTrack = -1;
    private int videoTrack = -1;
    private boolean hasAudio = false;
    private boolean hasVideo = false;
    public Mp4Muxer(String path, boolean hasAudio, boolean hasVideo) {
        try {
            this.hasAudio = hasAudio;
            this.hasVideo = hasVideo;
            mediaMuxer = new MediaMuxer(path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            isInited = true;
        } catch (IOException e) {
            isInited = false;
            e.printStackTrace();
        }
    }

    public boolean checkInited() {
        return isInited;
    }

    @Override
    public void onMediaFormat(MediaFormat mediaFormat, MediaEncoderWrapper.Kind kind) {
        Log.e(TAG, "onAddTrack: " + mediaFormat.toString());
        if (kind == MediaEncoderWrapper.Kind.VIDEO_ENCODER && hasVideo)
            videoTrack = mediaMuxer.addTrack(mediaFormat);
        if (kind == MediaEncoderWrapper.Kind.AUDIO_ENCODER && hasAudio)
            audioTrack = mediaMuxer.addTrack(mediaFormat);
        if ((videoTrack != -1 || !hasVideo)&& (audioTrack != -1 || !hasAudio)) {
            mediaMuxer.start();
            isRunning = true;
        }
    }

    @Override
    public void onData(ByteBuffer data, MediaCodec.BufferInfo bufferInfo, MediaEncoderWrapper.Kind kind) {
       // Log.e(TAG,"onData kind = "+kind);
        synchronized (this) {
            if (!isRunning)
                return;
            if (kind == MediaEncoderWrapper.Kind.VIDEO_ENCODER && hasVideo) {
                if(videoTrack!= -1) {
                    mediaMuxer.writeSampleData(videoTrack, data, bufferInfo);
                }
            }
            if (kind == MediaEncoderWrapper.Kind.AUDIO_ENCODER && hasAudio) {
                if(audioTrack!= -1) {
                    mediaMuxer.writeSampleData(audioTrack, data, bufferInfo);
                }
            }
        }
    }


    public void release() {
        if (!checkInited()) {
            return;
        }

        synchronized (this) {
            isRunning = false;
            isInited = false;
            try {
                mediaMuxer.release();
            } catch (IllegalStateException e) {
                e.printStackTrace();
            }
        }
    }
}
