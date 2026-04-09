package com.rhrtc.webrtc;

import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaFormat;
import android.util.Log;
import org.webrtc.VideoFrame;
import java.io.IOException;
import java.nio.ByteBuffer;



public class MediaEncoderWrapper {
    private static final String TAG = "MediaEncoderWrapper";
    public static final String AAC_MIME = "audio/mp4a-latm";
    public static final String AVC_MIME = "video/avc";
    private final int AAC_FRAME_SAMPLES_SIZE = 1024;
    public static final int DEFAULT_FPS = 15;
    public static final int DEFAULT_COLOR_FORMAT = MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar;
    private Kind kind;
    private MediaCodec mediaCodec;
    private EncoderCallback callback;
    private boolean isRunning = false;
    private boolean isInited = false;
    private long audioIntervalInUs = 0;
    private long initialAudioTimeStamp = -1;
    private long outputCounter;
    private long inputCounter;
    private MediaFormat inputMediaFormat;
    private long firstInputTimeStamp = -1;
    private boolean notifyMediaFormatChange = false;
    private boolean bVerifyAudioPTS = true;
    private long startTimeStamp = 0;
    private final boolean DEBUG = false;
    private MediaFormat outFormat;
    private FileDumper fileDumper = new FileDumper();

    private Thread outputThread = new Thread(new Runnable() {
        @Override
        public void run() {
            while (isRunning) {
                MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
                int index = mediaCodec.dequeueOutputBuffer(bufferInfo, 500 * 1000);
                if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
//                    if (callback != null)
//                        callback.onMediaFormat(mediaCodec.getOutputFormat(), kind);
                } else if (index >= 0) {
                    if (!notifyMediaFormatChange) {
                        notifyMediaFormatChange = true;
                        outFormat = mediaCodec.getOutputFormat();
                        if (callback != null)
                            callback.onMediaFormat(mediaCodec.getOutputFormat(), kind);
                    }
                    outputCounter++;
                    //verify audio timeStamp
                    if (kind == Kind.AUDIO_ENCODER) {
                        if (bVerifyAudioPTS) {
                            if (initialAudioTimeStamp == -1)
                                initialAudioTimeStamp = 0;
                            else
                                initialAudioTimeStamp += audioIntervalInUs;
                            bufferInfo.presentationTimeUs = initialAudioTimeStamp;
                        }
                        if (DEBUG)
                            Log.d(TAG,kind + " presentationTimeUs: " + bufferInfo.presentationTimeUs);

                    }

                    ByteBuffer ouputBuffer = mediaCodec.getOutputBuffer(index);
                    if (kind == Kind.AUDIO_ENCODER && DEBUG) {
                        fileDumper.write(genADTSHeader(bufferInfo.size));
                        fileDumper.write(ouputBuffer, bufferInfo.offset, bufferInfo.size);
                    }
                    if (callback != null)
                        callback.onData(ouputBuffer, bufferInfo, kind);
                    mediaCodec.releaseOutputBuffer(index, false);
                }
            }

            if (DEBUG && kind == Kind.AUDIO_ENCODER)
                fileDumper.release();

            mediaCodec.stop();
            mediaCodec.release();
        }
    });

    public MediaEncoderWrapper(Kind kind, MediaFormat mediaFormat) {
        this.kind = kind;
        inputMediaFormat = mediaFormat;
        if (kind == Kind.AUDIO_ENCODER) {
            audioIntervalInUs = AAC_FRAME_SAMPLES_SIZE * 1000 * 1000 / inputMediaFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
            Log.d(TAG,"audio interval: " + audioIntervalInUs);
        }
        try {
            mediaCodec = MediaCodec.createEncoderByType(mediaFormat.getString(MediaFormat.KEY_MIME));
            mediaCodec.configure(mediaFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        } catch (IOException e) {
            isInited = false;
            e.printStackTrace();
        }

        isInited = true;
    }


    public boolean checkInited() {
        return isInited;
    }

    public void setCallback(EncoderCallback encoderCallback) {
        this.callback = encoderCallback;
    }


    public static MediaFormat createAVCMediaFormat(VideoFrame videoFrame, int avcProfile, int avcLevel) {
        MediaFormat inputMediaFormat = new MediaFormat();
        int bitrate = videoFrame.getBuffer().getHeight() * videoFrame.getBuffer().getWidth();
        inputMediaFormat.setInteger(MediaFormat.KEY_WIDTH, videoFrame.getBuffer().getWidth());
        inputMediaFormat.setInteger(MediaFormat.KEY_HEIGHT, videoFrame.getBuffer().getHeight());
        inputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
        inputMediaFormat.setInteger(MediaFormat.KEY_FRAME_RATE, DEFAULT_FPS);

        inputMediaFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT, DEFAULT_COLOR_FORMAT);

        if (avcProfile != -1) {
            inputMediaFormat.setInteger(MediaFormat.KEY_PROFILE, avcProfile);
        }

        if (avcLevel != -1) {
            inputMediaFormat.setInteger(MediaFormat.KEY_LEVEL, avcLevel);
        }

        inputMediaFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
        inputMediaFormat.setString(MediaFormat.KEY_MIME, AVC_MIME);
        return inputMediaFormat;
    }

    public static MediaFormat createAACMediaFormat(AudioSample audioSample, int aacProfile) {
        MediaFormat inputMediaFormat = new MediaFormat();
        int bitrate = audioSample.getSampleRate() * 2;
        inputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
        inputMediaFormat.setInteger(MediaFormat.KEY_CHANNEL_COUNT, audioSample.getChannelCount());
        inputMediaFormat.setInteger(MediaFormat.KEY_SAMPLE_RATE, audioSample.getSampleRate());
        inputMediaFormat.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, audioSample.getData().length);


        if (aacProfile != -1) {
            inputMediaFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, aacProfile);
        }

        inputMediaFormat.setString(MediaFormat.KEY_MIME, AAC_MIME);
        return inputMediaFormat;
    }

    private static MediaCodecInfo getCodecInfo(String mime) {
        MediaCodecInfo codecInfo = null;
        MediaCodecList codecList = new MediaCodecList(MediaCodecList.REGULAR_CODECS);
        MediaCodecInfo[] codecInfos = codecList.getCodecInfos();

        for (MediaCodecInfo info : codecInfos) {
            if (!info.isEncoder()) {
                continue;
            }

            String[] types = info.getSupportedTypes();
            for (String type : types) {
                if (type.equals(mime)) {
                    codecInfo = info;
                    break;
                }
            }
        }
        return codecInfo;
    }

    public static boolean isMimeSupport(String mime) {
        return getCodecInfo(mime) != null;
    }

    public static boolean isMimeAndColorFormatSupport(String mime, int colorFormat) {
        boolean isSupported = false;
        MediaCodecInfo codecInfo = getCodecInfo(mime);
        if (codecInfo != null) {
            MediaCodecInfo.CodecCapabilities capabilities = codecInfo.getCapabilitiesForType(mime);
            for (int subFormat : capabilities.colorFormats) {
                if (subFormat == colorFormat) {
                    isSupported = true;
                    break;
                }
            }
        }
        return isSupported;
    }

    public void start() {
        if (isRunning || !checkInited())
            return;
        if (DEBUG && kind == Kind.AUDIO_ENCODER)
            fileDumper.init(System.currentTimeMillis() + ".aac");
        initialAudioTimeStamp = -1;
        startTimeStamp = System.currentTimeMillis();
        isRunning = true;
        outputCounter = 0;
        inputCounter = 0;
        mediaCodec.start();
        outputThread.start();
    }

    public void stop() {
        if (!isRunning || !checkInited())
            return;
        isInited = false;
        isRunning = false;
        Log.d(TAG,kind + " input frame: " + inputCounter + " output frame: " + outputCounter +
                " duration: " + (System.currentTimeMillis() - startTimeStamp) + "ms");
    }

    public void queueRawFrame(ByteBuffer data, long timeInMs) {
        if (!isRunning)
            return;
        inputCounter++;
        if (firstInputTimeStamp == -1)
            firstInputTimeStamp = timeInMs;
        int index = mediaCodec.dequeueInputBuffer(-1);
        if (kind == Kind.AUDIO_ENCODER && DEBUG) {
            Log.d(TAG,kind + " audio input time stamp: " + (timeInMs - firstInputTimeStamp) + "ms");
        }
        if (index >= 0) {
            ByteBuffer inputBuffer = mediaCodec.getInputBuffer(index);
            inputBuffer.put(data);
            mediaCodec.queueInputBuffer(index, 0, data.capacity(), (timeInMs - firstInputTimeStamp) * 1000, 0);
        }
    }

    private byte[] genADTSHeader(int packetLen) {
        byte[] adtsHeader = new byte[7];
        packetLen += 7;
        ByteBuffer esds = outFormat.getByteBuffer("csd-0");
        int audioProfile = (esds.get(0) >> 3) & 0x1f;
        int audioFrequency = (esds.get(0) & 0x7) << 1 | (esds.get(1) >> 7) & 0x1;
        int audioChannel = (esds.get(1) >> 3) & 0xf;

        adtsHeader[0] = (byte) 0xFF;
        adtsHeader[1] = (byte) 0xF9;
        adtsHeader[2] = (byte) (((audioProfile - 1) << 6) + (audioFrequency << 2) + (audioChannel >> 2));
        adtsHeader[3] = (byte) (((audioChannel & 3) << 6) + (packetLen >> 11));
        adtsHeader[4] = (byte) ((packetLen & 0x7FF) >> 3);
        adtsHeader[5] = (byte) (((packetLen & 7) << 5) + 0x1F);
        adtsHeader[6] = (byte) 0xFC;
        return adtsHeader;
    }

    public interface EncoderCallback {
        public void onMediaFormat(MediaFormat mediaFormat, Kind kind);

        public void onData(ByteBuffer data, MediaCodec.BufferInfo bufferInfo, Kind kind);
    }

    public enum Kind {
        VIDEO_ENCODER,
        AUDIO_ENCODER,
    }
}
