package com.rhrtc.webrtc.record;

import android.graphics.Bitmap;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.view.Surface;

import com.rhrtc.webrtc.utils.RHYuvHelper;

import org.webrtc.EglBase;
import org.webrtc.GlRectDrawer;
import org.webrtc.VideoFrame;
import org.webrtc.VideoFrameDrawer;
import org.webrtc.VideoSink;
import org.webrtc.audio.JavaAudioDeviceModule;
import org.webrtc.audio.JavaAudioDeviceModule.SamplesReadyCallback;


import java.io.IOException;
import java.nio.ByteBuffer;

class VideoFileRenderer implements VideoSink, SamplesReadyCallback {
    private static final String TAG = "VideoFileRenderer";
    public static final String AVC_MIME = "video/avc";
    private final int AAC_FRAME_SAMPLES_SIZE = 1024;
    public static final int DEFAULT_FPS = 25;
    public static final int DEFAULT_COLOR_FORMAT = MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar;
    private final HandlerThread renderThread;
    private final Handler renderThreadHandler;
    private final HandlerThread audioThread;
    private final Handler audioThreadHandler;
    private int outputFileWidth = -1;
    private int outputFileHeight = -1;
    private ByteBuffer[] encoderOutputBuffers;
    private ByteBuffer[] encoderinputBuffers ;
    private ByteBuffer[] audioInputBuffers;
    private ByteBuffer[] audioOutputBuffers;
    private EglBase eglBase;
    private EglBase.Context sharedContext;
    private VideoFrameDrawer frameDrawer;

    // TODO: these ought to be configurable as well
    private static final String MIME_TYPE = "video/avc";    // H.264 Advanced Video Coding
    private static final int FRAME_RATE = 25;               // 30fps
    private static final int IFRAME_INTERVAL = 5;           // 5 seconds between I-frames

    private MediaMuxer mediaMuxer;
    private MediaCodec encoder;
    private MediaCodec.BufferInfo bufferInfo, audioBufferInfo;
    private int trackIndex = -1;
    private int audioTrackIndex;
    private boolean isRunning = true;
    private GlRectDrawer drawer;
    private Surface surface;
    private MediaCodec audioEncoder;



    VideoFileRenderer(String outputFile, final EglBase.Context sharedContext, boolean withAudio) throws IOException {
        renderThread = new HandlerThread(TAG + "RenderThread");
        renderThread.start();
        renderThreadHandler = new Handler(renderThread.getLooper());
        if (withAudio) {
            audioThread = new HandlerThread(TAG + "AudioThread");
            audioThread.start();
            audioThreadHandler = new Handler(audioThread.getLooper());
        } else {
            audioThread = null;
            audioThreadHandler = null;
        }
        bufferInfo = new MediaCodec.BufferInfo();
        this.sharedContext = sharedContext;

        // Create a MediaMuxer.  We can't add the video track and start() the muxer here,
        // because our MediaFormat doesn't have the Magic Goodies.  These can only be
        // obtained from the encoder after it has started processing data.
        mediaMuxer = new MediaMuxer(outputFile,
                MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);

        audioTrackIndex = withAudio ? -1 : 0;
    }

    public static MediaFormat createAVCMediaFormat(int width,int height, int avcProfile, int avcLevel) {
        MediaFormat inputMediaFormat = new MediaFormat();
        int bitrate = width * height;
        inputMediaFormat.setInteger(MediaFormat.KEY_WIDTH, width);
        inputMediaFormat.setInteger(MediaFormat.KEY_HEIGHT, height);
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

    private void initVideoEncoder(VideoFrame videoFrame) {
        MediaFormat format  = createAVCMediaFormat(videoFrame.getBuffer().getWidth(),videoFrame.getBuffer().getHeight(), -1, -1);
        try {
            encoder = MediaCodec.createEncoderByType(MIME_TYPE);
            encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);

        } catch (Exception e) {
            Log.wtf(TAG, e);
        }

    }

    private void initVideoEncoderFromBitmap(Bitmap source) {
        MediaFormat format  = createAVCMediaFormat(source.getWidth(),source.getHeight(), -1, -1);
        try {
            encoder = MediaCodec.createEncoderByType(MIME_TYPE);
            encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);

        } catch (Exception e) {
            Log.wtf(TAG, e);
        }

    }
    public void InputBitmap(Bitmap source) {

        if (outputFileWidth == -1) {
            outputFileWidth = source.getWidth();
            outputFileHeight = source.getHeight();
            initVideoEncoderFromBitmap(source);
        }
        renderThreadHandler.post(() -> renderBitmapFrameOnRenderThread(source));

    }
    private void renderBitmapFrameOnRenderThread(Bitmap source) {
        if(encoderStarted  && encoder!= null){
        int[] rgbbuf = RHYuvHelper.getRGBByBitmappixels(source);
        if(rgbbuf!= null){
            int width =  source.getWidth();
            int height =  source.getHeight();
            int frameSize = width * height;
            int qFrameSize = frameSize / 4;
            int datalen = frameSize+2*qFrameSize;
            byte[] yuv420 = new byte[width*height*4];
            RHYuvHelper.rgbaencodeYUV420SP(yuv420,rgbbuf,width,height);

            int index = encoder.dequeueInputBuffer(-1);
            if (index >= 0) {
                ByteBuffer inputBuffer = encoder.getInputBuffer(index);
                inputBuffer.clear();
                inputBuffer.put(yuv420,0,datalen);
                long timecurrentTimeMillis = System.currentTimeMillis();

               // Log.e(TAG, "renderBitmapFrameOnRenderThread  ---------------------------"+timecurrentTimeMillis);
                encoder.queueInputBuffer(index, 0, datalen, timecurrentTimeMillis*1000, 0);
            }

        }
        }
        drainEncoder();
    }
    @Override
    public void onFrame(VideoFrame frame) {
        
        frame.retain();
        if (outputFileWidth == -1) {
            outputFileWidth = frame.getRotatedWidth();
            outputFileHeight = frame.getRotatedHeight();
            initVideoEncoder(frame);
        }
        renderThreadHandler.post(() -> renderFrameOnRenderThread(frame));
    }

    private void renderFrameOnRenderThread(VideoFrame frame) {

        if(encoderStarted  && encoder!= null){

            VideoFrame.I420Buffer i420 = frame.getBuffer().toI420();
            int width =  i420.getWidth();
            int height =  i420.getHeight();
            int frameSize = width * height;
            int qFrameSize = frameSize / 4;
            int datalen = frameSize+2*qFrameSize;
            byte[] yuv420 = new byte[width*height*4];
            byte[] remainingYBytes = new byte[i420.getDataY().remaining()];
            i420.getDataY().slice().get(remainingYBytes);
            if(remainingYBytes.length>0) {
                System.arraycopy(remainingYBytes, 0, yuv420, 0, frameSize);
            }
            byte[] remainingUBytes = new byte[i420.getDataU().remaining()];
            i420.getDataU().slice().get(remainingUBytes);
            if(remainingUBytes.length>0) {
                System.arraycopy(remainingUBytes, 0, yuv420, frameSize, qFrameSize);
            }
            byte[] remainingVBytes = new byte[i420.getDataV().remaining()];
            i420.getDataV().slice().get(remainingVBytes);

            if(remainingVBytes.length>0) {
                System.arraycopy(remainingVBytes, 0, yuv420, frameSize+qFrameSize, qFrameSize);
            }
            int index = encoder.dequeueInputBuffer(-1);
            if (index >= 0) {
                ByteBuffer inputBuffer = encoder.getInputBuffer(index);
                inputBuffer.clear();
                inputBuffer.put(yuv420,0,datalen);
                encoder.queueInputBuffer(index, 0, datalen, frame.getTimestampNs()/1000, 0);
            }

        }
        frame.release();
        drainEncoder();
        
    }
    private boolean encoderStarted = false;
    private volatile boolean muxerStarted = false;
    private long videoFrameStart = 0;
    /**
     * Release all resources. All already posted frames will be rendered first.
     */
    void release() {
        isRunning = false;
        if (audioThreadHandler != null)
            audioThreadHandler.post(() -> {
                if (audioEncoder != null) {
                    audioEncoder.stop();
                    audioEncoder.release();
                }
                audioThread.quit();
            });
        renderThreadHandler.post(() -> {
            if (encoder != null) {
                encoder.stop();
                encoder.release();
            }
            if(eglBase!=null){
                eglBase.release();
                eglBase =null;
            }
            if(mediaMuxer!=null){
                if(muxerStarted== true){
                    mediaMuxer.stop();
                    muxerStarted = false;
                }
               
                mediaMuxer.release();
            }

            renderThread.quit();
        });
    }



    private void drainEncoder() {
       
        if (!encoderStarted) {
            if(encoder!=null) {
                encoder.start();
                encoderOutputBuffers = encoder.getOutputBuffers();
                encoderinputBuffers = encoder.getInputBuffers();
                encoderStarted = true;
            }
            return;
        }
        while (true) {
            int encoderStatus = encoder.dequeueOutputBuffer(bufferInfo, 10000);
            if (encoderStatus == MediaCodec.INFO_TRY_AGAIN_LATER) {
                break;
            } else if (encoderStatus == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED) {
                // not expected for an encoder
                encoderOutputBuffers = encoder.getOutputBuffers();
                Log.e(TAG, "encoder output buffers changed");
            } else if (encoderStatus == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                // not expected for an encoder
                MediaFormat newFormat = encoder.getOutputFormat();

                Log.e(TAG, "encoder output format changed: " + newFormat);
                trackIndex = mediaMuxer.addTrack(newFormat);
                if (audioTrackIndex != -1 && !muxerStarted) {
                    mediaMuxer.start();
                    muxerStarted = true;
                }
                if (!muxerStarted)
                    break;
            } else if (encoderStatus < 0) {
                Log.e(TAG, "unexpected result fr om encoder.dequeueOutputBuffer: " + encoderStatus);
            } else { // encoderStatus >= 0
                try {
                    ByteBuffer encodedData = encoderOutputBuffers[encoderStatus];
                    if (encodedData == null) {
                        Log.e(TAG, "encoderOutputBuffer " + encoderStatus + " was null");
                        break;
                    }
                    // It's usually necessary to adjust the ByteBuffer values to match BufferInfo.
                    encodedData.position(bufferInfo.offset);
                    encodedData.limit(bufferInfo.offset + bufferInfo.size);
                    if (videoFrameStart == 0 && bufferInfo.presentationTimeUs != 0) {
                        videoFrameStart = bufferInfo.presentationTimeUs;
                    }
                    bufferInfo.presentationTimeUs -= videoFrameStart;
                    if (muxerStarted)
                        mediaMuxer.writeSampleData(trackIndex, encodedData, bufferInfo);
                    isRunning = isRunning && (bufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) == 0;
                    encoder.releaseOutputBuffer(encoderStatus, false);
                    if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        break;
                    }
                } catch (Exception e) {
                    Log.wtf(TAG, e);
                    break;
                }
            }
        }
    }

    private long presTime = 0L;

    private void drainAudio() {
        if (audioBufferInfo == null)
            audioBufferInfo = new MediaCodec.BufferInfo();
        while (true) {
            int encoderStatus = audioEncoder.dequeueOutputBuffer(audioBufferInfo, 10000);
            if (encoderStatus == MediaCodec.INFO_TRY_AGAIN_LATER) {
                break;
            } else if (encoderStatus == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED) {
                // not expected for an encoder
                audioOutputBuffers = audioEncoder.getOutputBuffers();
                Log.w(TAG, "encoder output buffers changed");
            } else if (encoderStatus == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                // not expected for an encoder
                MediaFormat newFormat = audioEncoder.getOutputFormat();

                Log.w(TAG, "encoder output format changed: " + newFormat);
                audioTrackIndex = mediaMuxer.addTrack(newFormat);
                if (trackIndex != -1 && !muxerStarted) {
                    mediaMuxer.start();
                    muxerStarted = true;
                }
                if (!muxerStarted)
                    break;
            } else if (encoderStatus < 0) {
                Log.e(TAG, "unexpected result fr om encoder.dequeueOutputBuffer: " + encoderStatus);
            } else { // encoderStatus >= 0
                try {
                    ByteBuffer encodedData = audioOutputBuffers[encoderStatus];
                    if (encodedData == null) {
                        Log.e(TAG, "encoderOutputBuffer " + encoderStatus + " was null");
                        break;
                    }
                    // It's usually necessary to adjust the ByteBuffer values to match BufferInfo.
                    encodedData.position(audioBufferInfo.offset);
                    encodedData.limit(audioBufferInfo.offset + audioBufferInfo.size);
                    if (muxerStarted)
                        mediaMuxer.writeSampleData(audioTrackIndex, encodedData, audioBufferInfo);
                    isRunning = isRunning && (audioBufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) == 0;
                    audioEncoder.releaseOutputBuffer(encoderStatus, false);
                    if ((audioBufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        break;
                    }
                } catch (Exception e) {
                    Log.wtf(TAG, e);
                    break;
                }
            }
        }
    }

    @Override
    public void onWebRtcAudioRecordSamplesReady(JavaAudioDeviceModule.AudioSamples audioSamples) {
        if (!isRunning)
            return;
        audioThreadHandler.post(() -> {
            if (audioEncoder == null) try {
                audioEncoder = MediaCodec.createEncoderByType("audio/mp4a-latm");
                MediaFormat format = new MediaFormat();
                format.setString(MediaFormat.KEY_MIME, "audio/mp4a-latm");
                format.setInteger(MediaFormat.KEY_CHANNEL_COUNT, audioSamples.getChannelCount());
                format.setInteger(MediaFormat.KEY_SAMPLE_RATE, audioSamples.getSampleRate());
                format.setInteger(MediaFormat.KEY_BIT_RATE, 64 * 1024);
                format.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
                audioEncoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
                audioEncoder.start();
                audioInputBuffers = audioEncoder.getInputBuffers();
                audioOutputBuffers = audioEncoder.getOutputBuffers();
            } catch (IOException exception) {
                Log.wtf(TAG, exception);
            }
            int bufferIndex = audioEncoder.dequeueInputBuffer(0);
            if (bufferIndex >= 0) {
                ByteBuffer buffer = audioInputBuffers[bufferIndex];
                buffer.clear();
                byte[] data = audioSamples.getData();
                buffer.put(data);
                audioEncoder.queueInputBuffer(bufferIndex, 0, data.length, presTime, 0);
                presTime += data.length * 125 / 12; // 1000000 microseconds / 48000hz / 2 bytes
            }
            drainAudio();
        });
    }

}
