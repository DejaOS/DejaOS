/*
 *  Copyright 2014 The WebRTC Project Authors. All rights reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

package com.rhrtc.webrtc;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import androidx.annotation.Nullable;

import android.util.Log;

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.webrtc.AudioSource;
import org.webrtc.AudioTrack;
import org.webrtc.CameraVideoCapturer;
import org.webrtc.CandidatePairChangeEvent;
import org.webrtc.DataChannel;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.Logging;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.MediaStreamTrack;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnection.IceConnectionState;
import org.webrtc.PeerConnection.PeerConnectionState;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpParameters;
import org.webrtc.RtpReceiver;
import org.webrtc.RtpSender;
import org.webrtc.RtpTransceiver;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;
import org.webrtc.SoftwareVideoDecoderFactory;
import org.webrtc.SoftwareVideoEncoderFactory;
import org.webrtc.StatsObserver;
import org.webrtc.StatsReport;
import org.webrtc.SurfaceTextureHelper;
import org.webrtc.VideoCapturer;
import org.webrtc.VideoDecoderFactory;
import org.webrtc.VideoEncoderFactory;
import org.webrtc.VideoFrame;
import org.webrtc.VideoSink;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;
import org.webrtc.YuvHelper;
import org.webrtc.audio.AudioDeviceModule;
import org.webrtc.audio.JavaAudioDeviceModule;

import com.rhrtc.webrtc.record.AudioSamplesInterceptor;
import com.rhrtc.webrtc.record.MediaRecorderImpl;
import com.rhrtc.webrtc.record.OutputAudioSamplesInterceptor;
import com.rhrtc.webrtc.utils.FileUtils;

/**
 * Peer connection client implementation.
 *
 * <p>All public methods are routed to local looper thread.
 * All PeerConnectionEvents callbacks are invoked from the same looper thread.
 * This class is a singleton.
 */
public class PeerConnectionClient {
  public static final String VIDEO_TRACK_ID = "ARDAMSv0";
  public static final String AUDIO_TRACK_ID = "ARDAMSa0";
  public static final String VIDEO_TRACK_TYPE = "video";
  private static final String TAG = "PeerConnectionClient";
  private static final String VIDEO_CODEC_VP8 = "VP8";
  private static final String VIDEO_CODEC_VP9 = "VP9";
  private static final String VIDEO_CODEC_H264 = "H264";
  private static final String VIDEO_CODEC_H264_BASELINE = "H264 Baseline";
  private static final String VIDEO_CODEC_H264_HIGH = "H264 High";
  private static final String AUDIO_CODEC_OPUS = "opus";
  private static final String AUDIO_CODEC_ISAC = "ISAC";
  private static final String VIDEO_CODEC_PARAM_START_BITRATE = "x-google-start-bitrate";
  private static final String VIDEO_FLEXFEC_FIELDTRIAL =
      "WebRTC-FlexFEC-03-Advertised/Enabled/WebRTC-FlexFEC-03/Enabled/";
  private static final String VIDEO_VP8_INTEL_HW_ENCODER_FIELDTRIAL = "WebRTC-IntelVP8/Enabled/";
  private static final String DISABLE_WEBRTC_AGC_FIELDTRIAL =
      "WebRTC-Audio-MinimizeResamplingOnMobile/Enabled/";
  private static final String AUDIO_CODEC_PARAM_BITRATE = "maxaveragebitrate";
  private static final String AUDIO_ECHO_CANCELLATION_CONSTRAINT = "googEchoCancellation";
  private static final String AUDIO_AUTO_GAIN_CONTROL_CONSTRAINT = "googAutoGainControl";
  private static final String AUDIO_HIGH_PASS_FILTER_CONSTRAINT = "googHighpassFilter";
  private static final String AUDIO_NOISE_SUPPRESSION_CONSTRAINT = "googNoiseSuppression";
  private static final String DTLS_SRTP_KEY_AGREEMENT_CONSTRAINT = "DtlsSrtpKeyAgreement";
  private static final int HD_VIDEO_WIDTH = 1280;
  private static final int HD_VIDEO_HEIGHT = 720;
  private static final int BPS_IN_KBPS = 1000;
  private static final String RTCEVENTLOG_OUTPUT_DIR_NAME = "rtc_event_log";

  // Executor thread is started once in private ctor and is used for all
  // peer connection API calls to ensure new peer connection factory is
  // created on the same thread as previously destroyed factory.
  private static final ExecutorService executor = Executors.newSingleThreadExecutor();


  private final PCObserver pcObserver = new PCObserver();
  private final SDPObserver sdpObserver = new SDPObserver();
  private final Timer statsTimer = new Timer();
  private final EglBase rootEglBase;
  private final Context appContext;
  private final PeerConnectionParameters peerConnectionParameters;
  private final PeerConnectionEvents events;

  private JavaAudioDeviceModule audioDeviceModule;
  private  AudioSamplesInterceptor inputSamplesInterceptor = new AudioSamplesInterceptor();
  private OutputAudioSamplesInterceptor outputSamplesInterceptor = null;
  private  MediaRecorderImpl mediaRecorder = null;

  private final Object audioLock = new Object();
  private final Object videoLock = new Object();
  private final Lock lock = new ReentrantLock();
  private String recordpath;
  private int audioFrameCounter = 0;
  private int videoFrameCounter = 0;
  private long firstAudioFrameTimeStamp = 0;
  private long audioSampleInterval;

  //private Mp4Muxer mp4Muxer;
 // private MediaEncoderWrapper avcEncoder;
 // private MediaEncoderWrapper aacEncoder;
  private LinkedBlockingQueue<AudioSample> audioSamples = new LinkedBlockingQueue<>();
  private LinkedBlockingQueue<ByteBuffer> videoFrames = new LinkedBlockingQueue<>();
  @Nullable
  private PeerConnectionFactory factory;
  @Nullable
  private PeerConnection peerConnection;
  @Nullable
  private AudioSource audioSource;
  @Nullable private SurfaceTextureHelper surfaceTextureHelper;
  @Nullable private VideoSource videoSource;
  private boolean preferIsac;
  private boolean videoCapturerStopped;
  private boolean isError;
  private boolean RecordisRunning;
  private boolean hasAudio = true;
  private boolean hasVideo = true;
  @Nullable
  private VideoSink localRender;
  @Nullable private VideoSink remoteSinks;




  private int videoWidth;
  private int videoHeight;
  private int videoFps;
  private MediaConstraints audioConstraints;
  private MediaConstraints sdpMediaConstraints;
  // Queued remote ICE candidates are consumed only after both local and
  // remote descriptions are set. Similarly local ICE candidates are sent to
  // remote peer after both local and remote description are set.
  @Nullable
  private List<IceCandidate> queuedRemoteCandidates;
  private boolean isInitiator;
  @Nullable
  private SessionDescription localSdp; // either offer or answer SDP
  @Nullable
  private VideoCapturer videoCapturer;
  // enableVideo is set to true if video should be rendered and sent.
  private boolean renderVideo = true;
  @Nullable
  private VideoTrack localVideoTrack;
  @Nullable
  private VideoTrack remoteVideoTrack;
  @Nullable
  private RtpSender localVideoSender;
  // enableAudio is set to true if audio should be sent.
  private boolean enableAudio = true;
  private boolean enableSpeekAudio = true;
  @Nullable
  private AudioTrack localAudioTrack;
  @Nullable
  private DataChannel dataChannel;
  private final boolean dataChannelEnabled;
  // Enable RtcEventLog.
  @Nullable

  private boolean isConnected = false;
  private boolean enablecapture = false;
  private boolean createCodecError= false;
  private boolean createCodecSuccess= false;
  // Implements the WebRtcAudioRecordSamplesReadyCallback interface and writes
  // recorded audio samples to an output file.

  private  class SaveVideoSink implements VideoSink {

    @Override
    synchronized public void onFrame(VideoFrame frame) {
     // Log.e(TAG, "SaveVideoSink  onFrame" );
      if(enablecapture){
        enablecapture = false;
          VideoFrame.I420Buffer i420 = frame.getBuffer().toI420();
          ByteBuffer nv12 = ByteBuffer.allocateDirect(i420.getWidth() * i420.getHeight() * 3 / 2);
          YuvHelper.I420ToNV12(i420.getDataY(), i420.getStrideY(),i420.getDataV(), i420.getStrideV(), i420.getDataU(), i420.getStrideU(),
                   nv12, i420.getWidth(), i420.getHeight());
          executor.execute(() -> {
              events.onPeerConnectionCapture(nv12,i420.getWidth(), i420.getHeight());
          });

      }
      if (!isRecording())
        return;
/*
      if (avcEncoder == null) {
        synchronized (this) {
          if (createCodecError)
            return;
          avcEncoder = new MediaEncoderWrapper(MediaEncoderWrapper.Kind.VIDEO_ENCODER,
                  MediaEncoderWrapper.createAVCMediaFormat(frame, -1, -1));
          if (!avcEncoder.checkInited()) {
            createCodecError = true;
            executor.execute(() -> {
              Log.e(TAG,"create avc encoder fail");
              // mCallback.onFailure(new KtyError("create avc encoder fail"));
              stopRecord();
            });
            return;
          }
          Log.e(TAG, "create avc encoder success");
          if (aacEncoder != null || !hasAudio) {
            notifySuccess();

          }
        }
      }
      if (!createCodecSuccess)
        return;

      VideoFrame.I420Buffer i420 = frame.getBuffer().toI420();
      ByteBuffer nv12 = ByteBuffer.allocateDirect(i420.getWidth() * i420.getHeight() * 3 / 2);
      YuvHelper.I420ToNV12(i420.getDataY(), i420.getStrideY(),i420.getDataV(), i420.getStrideV(), i420.getDataU(), i420.getStrideU(),
              nv12, i420.getWidth(), i420.getHeight());

      videoFrames.offer(nv12);
      executor.execute(() -> {
        synchronized (videoLock) {
          try {
            ByteBuffer videoFramebuffer = videoFrames.poll(0, TimeUnit.MILLISECONDS);
            if (videoFramebuffer != null) {

              videoFrameCounter++;
              avcEncoder.queueRawFrame(videoFramebuffer, System.currentTimeMillis());

            } else {
              Log.e(TAG,"video frame is null");
            }
          } catch (InterruptedException e) {
            e.printStackTrace();
            Log.e(TAG,"video frame "+e.getMessage());
          }
        }
      });

*/

    }

  }

  private  SaveVideoSink remoteSaveSink = new SaveVideoSink();


  private SignalingParameters signalingParameters_;

  public static class SignalingParameters {
    public  List<PeerConnection.IceServer> iceServers;
    public  boolean initiator;
    public  String clientId;
    public  SessionDescription offerSdp;
    public  List<IceCandidate> iceCandidates;

    public SignalingParameters(List<PeerConnection.IceServer> iceServers, boolean initiator,
                               String clientId, SessionDescription offerSdp,
                               List<IceCandidate> iceCandidates) {
      this.iceServers = iceServers;
      this.initiator = initiator;
      this.clientId = clientId;
      this.offerSdp = offerSdp;
      this.iceCandidates = iceCandidates;
    }
  }

  /**
   * Peer connection parameters.
   */
  public static class DataChannelParameters {
    public final boolean ordered;
    public final int maxRetransmitTimeMs;
    public final int maxRetransmits;
    public final String protocol;
    public final boolean negotiated;
    public final int id;

    public DataChannelParameters(boolean ordered, int maxRetransmitTimeMs, int maxRetransmits,
        String protocol, boolean negotiated, int id) {
      this.ordered = ordered;
      this.maxRetransmitTimeMs = maxRetransmitTimeMs;
      this.maxRetransmits = maxRetransmits;
      this.protocol = protocol;
      this.negotiated = negotiated;
      this.id = id;
    }
  }

  /**
   * Peer connection parameters.
   */
  public static class PeerConnectionParameters {
    public final boolean videoCallEnabled;
    public final boolean tracing;
    public final int videoWidth;
    public final int videoHeight;
    public final int videoFps;
    public final int videoMaxBitrate;
    public final String videoCodec;
    public final boolean videoCodecHwAcceleration;
    public final boolean videoFlexfecEnabled;
    public final int audioStartBitrate;
    public final String audioCodec;
    public final boolean noAudioProcessing;
    public final boolean aecDump;
    public final boolean saveInputAudioToFile;
    public final boolean useOpenSLES;
    public final boolean disableBuiltInAEC;
    public final boolean disableBuiltInAGC;
    public final boolean disableBuiltInNS;
    public final boolean disableWebRtcAGCAndHPF;
    public final boolean enableRtcEventLog;
    private final DataChannelParameters dataChannelParameters;

    public PeerConnectionParameters(boolean videoCallEnabled, boolean tracing,
        int videoWidth, int videoHeight, int videoFps, int videoMaxBitrate, String videoCodec,
        boolean videoCodecHwAcceleration, boolean videoFlexfecEnabled, int audioStartBitrate,
        String audioCodec, boolean noAudioProcessing, boolean aecDump, boolean saveInputAudioToFile,
        boolean useOpenSLES, boolean disableBuiltInAEC, boolean disableBuiltInAGC,
        boolean disableBuiltInNS, boolean disableWebRtcAGCAndHPF, boolean enableRtcEventLog,
        DataChannelParameters dataChannelParameters) {
      this.videoCallEnabled = videoCallEnabled;
      this.tracing = tracing;
      this.videoWidth = videoWidth;
      this.videoHeight = videoHeight;
      this.videoFps = videoFps;
      this.videoMaxBitrate = videoMaxBitrate;
      this.videoCodec = videoCodec;
      this.videoFlexfecEnabled = videoFlexfecEnabled;
      this.videoCodecHwAcceleration = videoCodecHwAcceleration;
      this.audioStartBitrate = audioStartBitrate;
      this.audioCodec = audioCodec;
      this.noAudioProcessing = noAudioProcessing;
      this.aecDump = aecDump;
      this.saveInputAudioToFile = saveInputAudioToFile;
      this.useOpenSLES = useOpenSLES;
      this.disableBuiltInAEC = disableBuiltInAEC;
      this.disableBuiltInAGC = disableBuiltInAGC;
      this.disableBuiltInNS = disableBuiltInNS;
      this.disableWebRtcAGCAndHPF = disableWebRtcAGCAndHPF;
      this.enableRtcEventLog = enableRtcEventLog;
      this.dataChannelParameters = dataChannelParameters;
    }
  }


  /**
   * Peer connection events.
   */
  public interface PeerConnectionEvents {
    /**
     * Callback fired once local SDP is created and set.
     */
    void onLocalDescription(final SessionDescription sdp);

    /**
     * Callback fired once local Ice candidate is generated.
     */
    void onIceCandidate(final IceCandidate candidate);

    /**
     * Callback fired once local ICE candidates are removed.
     */
    void onIceCandidatesRemoved(final IceCandidate[] candidates);

    /**
     * Callback fired once connection is established (IceConnectionState is
     * CONNECTED).
     */
    void onIceConnected();

    /**
     * Callback fired once connection is disconnected (IceConnectionState is
     * DISCONNECTED).
     */
    void onIceDisconnected();

    /**
     * Callback fired once DTLS connection is established (PeerConnectionState
     * is CONNECTED).
     */
    void onConnected();

    /**
     * Callback fired once DTLS connection is disconnected (PeerConnectionState
     * is DISCONNECTED).
     */
    void onDisconnected();

    /**
     * Callback fired once peer connection is closed.
     */
    void onPeerConnectionClosed();

    /**
     * Callback fired once peer connection statistics is ready.
     */
    void onPeerConnectionStatsReady(final StatsReport[] reports);

    /**
     * Callback fired once peer connection error happened.
     */
    void onPeerConnectionError(final String description);

    void onPeerConnectionCapture(ByteBuffer nv12,int width,int height);

    void onDataChennelRecvText(int mId,String msg);
    void onDataChennelRecvRaw(int mId,byte[] bytes);

    void onDataChennelState(int mId,String state);

  }

  /**
   * Create a PeerConnectionClient with the specified parameters. PeerConnectionClient takes
   * ownership of |eglBase|.
   */
  public PeerConnectionClient(Context appContext, EglBase eglBase,
      PeerConnectionParameters peerConnectionParameters, PeerConnectionEvents events) {
    this.rootEglBase = eglBase;
    this.appContext = appContext;
    this.events = events;
    this.peerConnectionParameters = peerConnectionParameters;
    this.dataChannelEnabled = peerConnectionParameters.dataChannelParameters != null;

    Log.d(TAG, "Preferred video codec: " + getSdpVideoCodecName(peerConnectionParameters));

    final String fieldTrials = getFieldTrials(peerConnectionParameters);
    executor.execute(() -> {
      Log.d(TAG, "Initialize WebRTC. Field trials: " + fieldTrials);
      PeerConnectionFactory.initialize(
          PeerConnectionFactory.InitializationOptions.builder(appContext)
              .setFieldTrials(fieldTrials)
              .setEnableInternalTracer(true)
              .createInitializationOptions());
    });

  }

  /**
   * This function should only be called once.
   */
  public void createPeerConnectionFactory(PeerConnectionFactory.Options options) {
    if (factory != null) {
      throw new IllegalStateException("PeerConnectionFactory has already been constructed");
    }
    executor.execute(() -> createPeerConnectionFactoryInternal(options));
  }



  public void createPeerConnection(final VideoSink localRender, final VideoSink remoteSinks,
      final VideoCapturer videoCapturer, final SignalingParameters signalingParameters) {
    Log.d(TAG, "createPeerConnection");
    if (peerConnectionParameters == null) {
      Log.e(TAG, "Creating peer connection without initializing factory.");
      return;
    }
    this.localRender = localRender;
    this.remoteSinks = remoteSinks;
    this.videoCapturer = videoCapturer;
    this.signalingParameters_ = signalingParameters;
    executor.execute(() -> {
      try {
        createMediaConstraintsInternal();
        createPeerConnectionInternal();
        maybeCreateAndStartRtcEventLog();
      } catch (Exception e) {
        reportError("Failed to create peer connection: " + e.getMessage());
        throw e;
      }
    });
  }

  public void close() {
    executor.execute(this ::closeInternal);
  }

  private boolean isVideoCallEnabled() {
    return peerConnectionParameters.videoCallEnabled && videoCapturer != null;
  }

  private void createPeerConnectionFactoryInternal(PeerConnectionFactory.Options options) {
    isError = false;
    Log.d(TAG, "createPeerConnectionFactoryInternal");
    if (peerConnectionParameters.tracing) {
      PeerConnectionFactory.startInternalTracingCapture(
          Environment.getExternalStorageDirectory().getAbsolutePath() + File.separator
          + "webrtc-trace.txt");
    }

    // Check if ISAC is used by default.
    preferIsac = peerConnectionParameters.audioCodec != null
        && peerConnectionParameters.audioCodec.equals(AUDIO_CODEC_ISAC);

    // It is possible to save a copy in raw PCM format on a file by checking
    // the "Save input audio to file" checkbox in the Settings UI. A callback
    // interface is set when this flag is enabled. As a result, a copy of recorded
    // audio samples are provided to this client directly from the native audio
    // layer in Java.
    if (peerConnectionParameters.saveInputAudioToFile) {
      if (!peerConnectionParameters.useOpenSLES) {
        Log.d(TAG, "Enable recording of microphone input audio to file");

      } else {
        // TODO(henrika): ensure that the UI reflects that if OpenSL ES is selected,
        // then the "Save inut audio to file" option shall be grayed out.
        Log.e(TAG, "Recording of input audio is not supported for OpenSL ES");
      }
    }

    final AudioDeviceModule adm = createJavaAudioDevice();

    audioDeviceModule = (JavaAudioDeviceModule) adm;
    // Create peer connection factory.
    if (options != null) {
      Log.d(TAG, "Factory networkIgnoreMask option: " + options.networkIgnoreMask);
    }
    final boolean enableH264HighProfile =
        VIDEO_CODEC_H264_HIGH.equals(peerConnectionParameters.videoCodec);
    final VideoEncoderFactory encoderFactory;
    final VideoDecoderFactory decoderFactory;

    if (peerConnectionParameters.videoCodecHwAcceleration) {
      encoderFactory = new DefaultVideoEncoderFactory(rootEglBase.getEglBaseContext(), true /* enableIntelVp8Encoder */, enableH264HighProfile);
      decoderFactory = new DefaultVideoDecoderFactory(rootEglBase.getEglBaseContext());

    } else {
      encoderFactory = new SoftwareVideoEncoderFactory();
      decoderFactory = new SoftwareVideoDecoderFactory();
    }

    factory = PeerConnectionFactory.builder()
                  .setOptions(options)
                  .setAudioDeviceModule(adm)
                  .setVideoEncoderFactory(encoderFactory)
                  .setVideoDecoderFactory(decoderFactory)
                  .createPeerConnectionFactory();
    Logging.enableLogToDebugOutput(Logging.Severity.LS_WARNING);
    Log.d(TAG, "Peer connection factory created.");
    adm.release();
  }

  AudioDeviceModule createJavaAudioDevice() {
    // Enable/disable OpenSL ES playback.
    if (!peerConnectionParameters.useOpenSLES) {
      Log.w(TAG, "External OpenSLES ADM not implemented yet.");
      // TODO(magjed): Add support for external OpenSLES ADM.
    }
/*
    SamplesReadyCallback samplesReadyCallback= new  SamplesReadyCallback() {

      @Override
      public void onWebRtcAudioRecordSamplesReady(JavaAudioDeviceModule.AudioSamples samples) {
        if (samples.getAudioFormat() != AudioFormat.ENCODING_PCM_16BIT) {
          Log.e(TAG, "Invalid audio format");
          return;
        }

        if (!isRecording())
          return;

        AudioSample audioSample = new AudioSample(samples.getAudioFormat(),
                samples.getChannelCount(),
                samples.getSampleRate(),
                samples.getData());
        if (aacEncoder == null) {
          synchronized (this) {
            if (createCodecError)
              return;
            Log.e(TAG,"onWebRtcAudioRecordSamplesReady  audioSample" +audioSample.getData()[0] + " " + audioSample.getData()[1] + " " + (short)(audioSample.getData()[1] << 8 |audioSample.getData()[0]));
            aacEncoder = new MediaEncoderWrapper(MediaEncoderWrapper.Kind.AUDIO_ENCODER,
                    MediaEncoderWrapper.createAACMediaFormat(audioSample, -1));
            if (!aacEncoder.checkInited()) {
              createCodecError = true;
              executor.execute(() -> {
                // mCallback.onFailure(new KtyError("create aac encoder fail"));
                stopRecord();
              });
              return;
            }
            Log.e(TAG,"create aac encoder success");
            if (avcEncoder != null || !hasVideo) {
              notifySuccess();
            }
            audioSampleInterval = audioSample.getData().length * 1000
                    / (audioSample.getSampleRate() * audioSample.getChannelCount() * 2);
            Log.e(TAG,"audio sample interval: " + audioSampleInterval);
          }
        }
        if (!createCodecSuccess)
          return;
        audioSamples.offer(audioSample);
        executor.execute(() -> {
          synchronized (audioLock) {
            try {
              AudioSample sample = audioSamples.poll(0, TimeUnit.MILLISECONDS);
              if (sample != null) {

                ByteBuffer audioFrame = ByteBuffer.wrap(sample.getData());
                audioFrameCounter++;
                aacEncoder.queueRawFrame(audioFrame, firstAudioFrameTimeStamp);
                firstAudioFrameTimeStamp += audioSampleInterval;
              } else {
                Log.e(TAG, "audio sample is null");
              }
            } catch (InterruptedException e) {
              e.printStackTrace();
            }
          }
        });
       // Log.e(TAG, "onWebRtcAudioRecordSamplesReady: samples length = "+samples.getData().length );


      }
    };

    // Set audio record error callbacks.
    AudioRecordErrorCallback audioRecordErrorCallback = new AudioRecordErrorCallback() {
      @Override
      public void onWebRtcAudioRecordInitError(String errorMessage) {
        Log.e(TAG, "onWebRtcAudioRecordInitError: " + errorMessage);
        reportError(errorMessage);
      }

      @Override
      public void onWebRtcAudioRecordStartError(
          JavaAudioDeviceModule.AudioRecordStartErrorCode errorCode, String errorMessage) {
        Log.e(TAG, "onWebRtcAudioRecordStartError: " + errorCode + ". " + errorMessage);
        reportError(errorMessage);
      }

      @Override
      public void onWebRtcAudioRecordError(String errorMessage) {
        Log.e(TAG, "onWebRtcAudioRecordError: " + errorMessage);
        reportError(errorMessage);
      }
    };

    AudioTrackErrorCallback audioTrackErrorCallback = new AudioTrackErrorCallback() {
      @Override
      public void onWebRtcAudioTrackInitError(String errorMessage) {
        Log.e(TAG, "onWebRtcAudioTrackInitError: " + errorMessage);
        reportError(errorMessage);
      }

      @Override
      public void onWebRtcAudioTrackStartError(
          JavaAudioDeviceModule.AudioTrackStartErrorCode errorCode, String errorMessage) {
        Log.e(TAG, "onWebRtcAudioTrackStartError: " + errorCode + ". " + errorMessage);
        reportError(errorMessage);
      }

      @Override
      public void onWebRtcAudioTrackError(String errorMessage) {
        Log.e(TAG, "onWebRtcAudioTrackError: " + errorMessage);
        reportError(errorMessage);
      }
    };

    // Set audio record state callbacks.
    AudioRecordStateCallback audioRecordStateCallback = new AudioRecordStateCallback() {
      @Override
      public void onWebRtcAudioRecordStart() {
        Log.i(TAG, "Audio recording starts");
      }

      @Override
      public void onWebRtcAudioRecordStop() {
        Log.i(TAG, "Audio recording stops");
      }
    };

    // Set audio track state callbacks.
    AudioTrackStateCallback audioTrackStateCallback = new AudioTrackStateCallback() {
      @Override
      public void onWebRtcAudioTrackStart() {
        Log.i(TAG, "Audio playout starts");
      }

      @Override
      public void onWebRtcAudioTrackStop() {
        Log.i(TAG, "Audio playout stops");
      }
    };

    return JavaAudioDeviceModule.builder(appContext)
        .setSamplesReadyCallback(samplesReadyCallback)
        .setUseHardwareAcousticEchoCanceler(!peerConnectionParameters.disableBuiltInAEC)
        .setUseHardwareNoiseSuppressor(!peerConnectionParameters.disableBuiltInNS)
        .setAudioRecordErrorCallback(audioRecordErrorCallback)
        .setAudioTrackErrorCallback(audioTrackErrorCallback)
        .setAudioRecordStateCallback(audioRecordStateCallback)
        .setAudioTrackStateCallback(audioTrackStateCallback)
        .createAudioDeviceModule();

 */
         return JavaAudioDeviceModule.builder(appContext)
                 .setUseHardwareAcousticEchoCanceler(true)
                 .setUseHardwareNoiseSuppressor(true)
                 .setSamplesReadyCallback(inputSamplesInterceptor)
                 .createAudioDeviceModule();

  }

  private void createMediaConstraintsInternal() {
    // Create video constraints if video call is enabled.
    if (isVideoCallEnabled()) {
      videoWidth = peerConnectionParameters.videoWidth;
      videoHeight = peerConnectionParameters.videoHeight;
      videoFps = peerConnectionParameters.videoFps;

      // If video resolution is not specified, default to HD.
      if (videoWidth == 0 || videoHeight == 0) {
        videoWidth = HD_VIDEO_WIDTH;
        videoHeight = HD_VIDEO_HEIGHT;
      }

      // If fps is not specified, default to 30.
      if (videoFps == 0) {
        videoFps = 30;
      }
      Logging.d(TAG, "Capturing format: " + videoWidth + "x" + videoHeight + "@" + videoFps);
    }

    // Create audio constraints.
    audioConstraints = new MediaConstraints();
    // added for audio performance measurements
    if (peerConnectionParameters.noAudioProcessing) {
      Log.d(TAG, "Disabling audio processing");
      audioConstraints.mandatory.add(
          new MediaConstraints.KeyValuePair(AUDIO_ECHO_CANCELLATION_CONSTRAINT, "false"));
      audioConstraints.mandatory.add(
          new MediaConstraints.KeyValuePair(AUDIO_AUTO_GAIN_CONTROL_CONSTRAINT, "false"));
      audioConstraints.mandatory.add(
          new MediaConstraints.KeyValuePair(AUDIO_HIGH_PASS_FILTER_CONSTRAINT, "false"));
      audioConstraints.mandatory.add(
          new MediaConstraints.KeyValuePair(AUDIO_NOISE_SUPPRESSION_CONSTRAINT, "false"));
    }
    // Create SDP constraints.
    sdpMediaConstraints = new MediaConstraints();
    sdpMediaConstraints.mandatory.add(
        new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));
    sdpMediaConstraints.mandatory.add(new MediaConstraints.KeyValuePair(
        "OfferToReceiveVideo", Boolean.toString(isVideoCallEnabled())));
  }

  private void createPeerConnectionInternal() {
    if (factory == null || isError) {
      Log.e(TAG, "Peerconnection factory is not created");
      return;
    }
    Log.d(TAG, "Create peer connection.");

    queuedRemoteCandidates = new ArrayList<>();

    PeerConnection.RTCConfiguration rtcConfig =
        new PeerConnection.RTCConfiguration(signalingParameters_.iceServers);
    // TCP candidates are only useful when connecting to a server that supports
    // ICE-TCP.
    rtcConfig.tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.DISABLED;
    rtcConfig.bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE;
    rtcConfig.rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE;
    rtcConfig.continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY;
    // Use ECDSA encryption.
    rtcConfig.keyType = PeerConnection.KeyType.ECDSA;
    // Enable DTLS for normal calls and disable for loopback calls.
    rtcConfig.enableDtlsSrtp = true;
    rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;
    rtcConfig.disableIpv6 = true;
    rtcConfig.disableIPv6OnWifi = true;
    rtcConfig.networkPreference = PeerConnection.AdapterType.UNKNOWN;


    peerConnection = factory.createPeerConnection(rtcConfig, pcObserver);
    if(peerConnection == null){
      Log.e(TAG, "Peerconnection  is failed  created");
      return;
    }

    if (dataChannelEnabled) {
      Log.d(TAG, "Peerconnection  createDataChannel");
      DataChannel.Init init = new DataChannel.Init();
      init.ordered = peerConnectionParameters.dataChannelParameters.ordered;
      init.negotiated = peerConnectionParameters.dataChannelParameters.negotiated;
      init.maxRetransmits = peerConnectionParameters.dataChannelParameters.maxRetransmits;
      init.maxRetransmitTimeMs = peerConnectionParameters.dataChannelParameters.maxRetransmitTimeMs;
      init.id = peerConnectionParameters.dataChannelParameters.id;
      init.protocol = peerConnectionParameters.dataChannelParameters.protocol;
      if(peerConnection!= null) {
        dataChannel = peerConnection.createDataChannel("data", init);
        if(dataChannel!= null){
          dataChannel.registerObserver(new DataChannel.Observer() {
            @Override
            public void onBufferedAmountChange(long previousAmount) {
              if(dataChannel!= null) {
               // Log.e(TAG, "Data channel buffered amount changed: "+dataChannel.state());
              }
            }

            @Override
            public void onStateChange() {
              if(dataChannel!= null){
                String state  = dataChannelStateString(dataChannel.state());
                Log.d(TAG, "Data channel state changed: ----------------state= "+state);
                events.onDataChennelState(dataChannel.id(),state);
              }

            }

            @Override
            public void onMessage(final DataChannel.Buffer buffer) {
              byte[] bytes;
              if (buffer.data.hasArray()) {
                bytes = buffer.data.array();
              } else {
                bytes = new byte[buffer.data.remaining()];
                buffer.data.get(bytes);
              }

              if (buffer.binary) {

                events.onDataChennelRecvRaw(dataChannel.id(),bytes);
              }else{
                events.onDataChennelRecvText(dataChannel.id(),new String(bytes, Charset.forName("UTF-8")));
              }

            }
          });

        }
      }
    }
    isInitiator = false;

    // Set INFO libjingle logging.
    // NOTE: this _must_ happen while |factory| is alive!
    Logging.enableLogToDebugOutput(Logging.Severity.LS_INFO);

    List<String> mediaStreamLabels = Collections.singletonList("ARDAMS");
    if (isVideoCallEnabled()) {
      peerConnection.addTrack(createVideoTrack(videoCapturer), mediaStreamLabels);

    }
    peerConnection.addTrack(createAudioTrack(), mediaStreamLabels);
    if (isVideoCallEnabled()) {
         findVideoSender();
    }

    if (peerConnectionParameters.aecDump) {
      try {
        ParcelFileDescriptor aecDumpFileDescriptor =
            ParcelFileDescriptor.open(new File(Environment.getExternalStorageDirectory().getPath()
                                          + File.separator + "Download/audio.aecdump"),
                ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE
                    | ParcelFileDescriptor.MODE_TRUNCATE);
        factory.startAecDump(aecDumpFileDescriptor.detachFd(), -1);
      } catch (IOException e) {
        Log.e(TAG, "Can not open aecdump file", e);
      }
    }
    Log.d(TAG, "Peer connection created.");
  }
  private String dataChannelStateString(DataChannel.State dataChannelState) {
    switch (dataChannelState) {
      case CONNECTING:
        return "connecting";
      case OPEN:
        return "open";
      case CLOSING:
        return "closing";
      case CLOSED:
        return "closed";
    }
    return "";
  }
  public void DataChannelSendText(String msg) {
        if(dataChannel!= null && dataChannelStateString(dataChannel.state()) == "open"){
          ByteBuffer byteBuffer;
          try {
            byteBuffer = ByteBuffer.wrap(msg.getBytes("UTF-8"));
          } catch (UnsupportedEncodingException e) {
            return;
          }
          DataChannel.Buffer buffer = new DataChannel.Buffer(byteBuffer, false);
          dataChannel.send(buffer);
        }
  }
  public void DataChannelSendRaw(ByteBuffer byteBuffer) {
    if(dataChannel!= null && dataChannelStateString(dataChannel.state()) == "open"){
      DataChannel.Buffer buffer = new DataChannel.Buffer(byteBuffer, true);
      dataChannel.send(buffer);
    }
  }
  private File createRtcEventLogOutputFile() {
    DateFormat dateFormat = new SimpleDateFormat("yyyyMMdd_hhmm_ss", Locale.getDefault());
    Date date = new Date();
    final String outputFileName = "event_log_" + dateFormat.format(date) + ".log";
    return new File(
        appContext.getDir(RTCEVENTLOG_OUTPUT_DIR_NAME, Context.MODE_PRIVATE), outputFileName);
  }

  private void maybeCreateAndStartRtcEventLog() {
    if (appContext == null || peerConnection == null) {
      return;
    }
    if (!peerConnectionParameters.enableRtcEventLog) {
      Log.d(TAG, "RtcEventLog is disabled.");
      return;
    }
  }

  private void closeInternal() {
    if (factory != null && peerConnectionParameters.aecDump) {
      factory.stopAecDump();
    }
    Log.d(TAG, "Closing peer connection.");
    statsTimer.cancel();
    if (dataChannel != null) {
      dataChannel.dispose();
      dataChannel = null;
    }

    Log.d(TAG, "Closing Peer Connection.");
    if (peerConnection != null) {
      peerConnection.dispose();
      peerConnection = null;
    }
    Log.d(TAG, "Closing audio source.");
    if (audioSource != null) {
      audioSource.dispose();
      audioSource = null;
    }
    Log.d(TAG, "Stopping capture.");
    if (videoCapturer != null) {
      try {
        videoCapturer.stopCapture();
      } catch (InterruptedException e) {
        throw new RuntimeException(e);
      }
      videoCapturerStopped = true;
      videoCapturer.dispose();
      videoCapturer = null;
    }
    Log.d(TAG, "Closing video source.");
    if (videoSource != null) {
      videoSource.dispose();
      videoSource = null;
    }
    Log.d(TAG, "Closing surface texture.");
    if (surfaceTextureHelper != null) {
      surfaceTextureHelper.dispose();
      surfaceTextureHelper = null;
    }

    localRender = null;
    remoteSinks = null;
    remoteSaveSink = null;
    remoteVideoTrack = null;

    Log.d(TAG, "Closing peer connection factory.");
    if (factory != null) {
      factory.dispose();
      factory = null;
    }
    rootEglBase.release();
    Log.d(TAG, "Closing peer connection done.");
    events.onPeerConnectionClosed();

  }
  private void startRecordingToFile(
          String path, VideoTrack videoTrack)
  {
    stopRecording();

    if(audioDeviceModule!= null) {
      if (outputSamplesInterceptor == null) {
        outputSamplesInterceptor = new OutputAudioSamplesInterceptor(audioDeviceModule);
      }
      AudioSamplesInterceptor interceptor = outputSamplesInterceptor;

      mediaRecorder = new MediaRecorderImpl(1, videoTrack, interceptor);

      if (mediaRecorder != null) {
        try {
          mediaRecorder.startRecording(new File(path));
        } catch (Exception e) {
          e.printStackTrace();
        }

      }
    }





  }
  void stopRecording() {

    if (mediaRecorder != null) {
      mediaRecorder.stopRecording();

      File file = mediaRecorder.getRecordFile();
      if (file != null) {
        FileUtils.saveVideo(appContext,file);

      }
    }


  }

  public boolean isRecording(){
      return RecordisRunning;
  }
  public  void startRecord(String path) {
    if (RecordisRunning)
      return;
    this.recordpath = path;
    Log.e(TAG, "startRecord "+path);
    startRecordingToFile(path,remoteVideoTrack);
    /*
    mp4Muxer = new Mp4Muxer(path, hasAudio,hasVideo);
    if (!mp4Muxer.checkInited()) {
      mp4Muxer.release();
      Log.e(TAG, "failed create mp4 muxer.");
      return;
    }
    if (!MediaEncoderWrapper.isMimeSupport(MediaEncoderWrapper.AAC_MIME)) {
      mp4Muxer.release();
      Log.e(TAG, "not support aac.");
      return;
    }

    if (!MediaEncoderWrapper.isMimeAndColorFormatSupport(MediaEncoderWrapper.AVC_MIME,
            MediaEncoderWrapper.DEFAULT_COLOR_FORMAT)) {
      mp4Muxer.release();
      Log.e(TAG, "not support avc");
      return;
    }

     */
    //LogUtils.debugInfo("start media capture");
    RecordisRunning = true;
    audioFrameCounter = 0;
    videoFrameCounter = 0;
    audioSamples.clear();
    videoFrames.clear();

  }

  public  void stopRecord() {
    if (!RecordisRunning)
      return;
    RecordisRunning = false;
    stopRecording();
/*
    mp4Muxer.release();

    if (avcEncoder != null) {
      avcEncoder.setCallback(null);
      avcEncoder.stop();
      avcEncoder = null;
    }

    if (aacEncoder != null) {
      aacEncoder.setCallback(null);
      aacEncoder.stop();
      aacEncoder = null;
    }

 */
    audioFrameCounter = 0;
    videoFrameCounter = 0;
    audioSamples.clear();
    videoFrames.clear();


  }
  private void notifySuccess() {
  //  executor.execute(() -> mCallback.onSuccess(null));
    Log.e(TAG, "notifySuccess");
    /*
    if(avcEncoder!=null) {
      avcEncoder.setCallback(mp4Muxer);
    }
    if(aacEncoder!= null) {
      aacEncoder.setCallback(mp4Muxer);
    }
    if(aacEncoder!= null) {
      aacEncoder.start();
    }
    if(avcEncoder!= null) {
      avcEncoder.start();
    }
    */
    createCodecSuccess = true;
  }
  public void InputBitmap(Bitmap source) {
       if(RecordisRunning && mediaRecorder!= null && remoteVideoTrack==null){
         mediaRecorder.InputBitmap(source);
       }
  }
  public void Capture() {
         if(isConnected) {
           enablecapture = true;
         }

  }

  public boolean isHDVideo() {
    return isVideoCallEnabled() && videoWidth * videoHeight >= 1280 * 720;
  }

  @SuppressWarnings("deprecation") // TODO(sakal): getStats is deprecated.
  private void getStats() {
    if (peerConnection == null || isError) {
      return;
    }
    boolean success = peerConnection.getStats(new StatsObserver() {
      @Override
      public void onComplete(final StatsReport[] reports) {
        events.onPeerConnectionStatsReady(reports);
      }
    }, null);
    if (!success) {
      Log.e(TAG, "getStats() returns false!");
    }
  }

  public void enableStatsEvents(boolean enable, int periodMs) {
    if (enable) {
      try {
        statsTimer.schedule(new TimerTask() {
          @Override
          public void run() {
            executor.execute(() -> getStats());
          }
        }, 0, periodMs);
      } catch (Exception e) {
        Log.e(TAG, "Can not schedule statistics timer", e);
      }
    } else {
      statsTimer.cancel();
    }
  }

  public void setAudioEnabled(final boolean enable) {
    executor.execute(() -> {
      enableAudio = enable;
      if (localAudioTrack != null) {
        localAudioTrack.setEnabled(enableAudio);
      }
    });
  }
  public void setAudioSpeakEnabled(final boolean enable) {
    AudioTrack audiotrack = getRemoteAudioTrack();
    executor.execute(() -> {
      if (audiotrack != null) {
        enableSpeekAudio = enable;
        audiotrack.setEnabled(enableSpeekAudio);
      }
    });
  }



  public void setVideoEnabled(final boolean enable) {
    executor.execute(() -> {
      renderVideo = enable;
      if (localVideoTrack != null) {
        localVideoTrack.setEnabled(renderVideo);
      }
      if (remoteVideoTrack != null) {
        remoteVideoTrack.setEnabled(renderVideo);
      }
    });
  }

  public void createOffer() {
    executor.execute(() -> {
      if (peerConnection != null && !isError) {
        Log.d(TAG, "PC Create OFFER");
        isInitiator = true;
        peerConnection.createOffer(sdpObserver, sdpMediaConstraints);
      }else{
        Log.e(TAG, "PC Create OFFER error -------------------------------------------"+isError);
      }
    });
  }

  public void createAnswer() {
    executor.execute(() -> {
      if (peerConnection != null && !isError) {
        Log.d(TAG, "PC create ANSWER");
        isInitiator = false;
        peerConnection.createAnswer(sdpObserver, sdpMediaConstraints);
      }
    });
  }

  public void addRemoteIceCandidate(final IceCandidate candidate) {
    executor.execute(() -> {
      if (peerConnection != null && !isError) {
        if (queuedRemoteCandidates != null) {
          queuedRemoteCandidates.add(candidate);
        } else {
          peerConnection.addIceCandidate(candidate);
        }
      }
    });
  }

  public void removeRemoteIceCandidates(final IceCandidate[] candidates) {
    executor.execute(() -> {
      if (peerConnection == null || isError) {
        return;
      }
      // Drain the queued remote candidates if there is any so that
      // they are processed in the proper order.
      drainCandidates();
      peerConnection.removeIceCandidates(candidates);
    });
  }

  public void setRemoteDescription(final SessionDescription sdp) {
    executor.execute(() -> {
      if (peerConnection == null || isError) {
        return;
      }
      String sdpDescription = sdp.description;
      if (preferIsac) {
        sdpDescription = preferCodec(sdpDescription, AUDIO_CODEC_ISAC, true);
      }
      if (isVideoCallEnabled()) {
        sdpDescription =
            preferCodec(sdpDescription, getSdpVideoCodecName(peerConnectionParameters), false);
      }
      if (peerConnectionParameters.audioStartBitrate > 0) {
        sdpDescription = setStartBitrate(
            AUDIO_CODEC_OPUS, false, sdpDescription, peerConnectionParameters.audioStartBitrate);
      }
      //Log.d(TAG, "Set remote SDP.  "+sdpDescription);
      SessionDescription sdpRemote = new SessionDescription(sdp.type, sdpDescription);
      peerConnection.setRemoteDescription(sdpObserver, sdpRemote);
    });
  }

  public void stopVideoSource() {
    executor.execute(() -> {
      if (videoCapturer != null && !videoCapturerStopped) {
        Log.d(TAG, "Stop video source.");
        try {
          videoCapturer.stopCapture();
        } catch (InterruptedException e) {
        }
        videoCapturerStopped = true;
      }
    });
  }

  public void startVideoSource() {
    executor.execute(() -> {
      if (videoCapturer != null && videoCapturerStopped) {
        Log.d(TAG, "Restart video source.");
        videoCapturer.startCapture(videoWidth, videoHeight, videoFps);
        videoCapturerStopped = false;
      }
    });
  }

  public void setVideoMaxBitrate(@Nullable final Integer maxBitrateKbps) {
    executor.execute(() -> {
      if (peerConnection == null || localVideoSender == null || isError) {
        return;
      }
      Log.d(TAG, "Requested max video bitrate: " + maxBitrateKbps);
      if (localVideoSender == null) {
        Log.w(TAG, "Sender is not ready.");
        return;
      }

      RtpParameters parameters = localVideoSender.getParameters();
      if (parameters.encodings.size() == 0) {
        Log.w(TAG, "RtpParameters are not ready.");
        return;
      }

      for (RtpParameters.Encoding encoding : parameters.encodings) {
        // Null value means no limit.
        encoding.maxBitrateBps = maxBitrateKbps == null ? null : maxBitrateKbps * BPS_IN_KBPS;
      }
      if (!localVideoSender.setParameters(parameters)) {
        Log.e(TAG, "RtpSender.setParameters failed.");
      }
      Log.d(TAG, "Configured max video bitrate to: " + maxBitrateKbps);
    });
  }

  private void reportError(final String errorMessage) {
    Log.e(TAG, "Peerconnection error: " + errorMessage);
    executor.execute(() -> {
      if (!isError) {
        events.onPeerConnectionError(errorMessage);
        isError = true;
      }
    });
  }

  @Nullable
  private AudioTrack createAudioTrack() {
    audioSource = factory.createAudioSource(audioConstraints);
    localAudioTrack = factory.createAudioTrack(AUDIO_TRACK_ID, audioSource);
    localAudioTrack.setEnabled(enableAudio);
    return localAudioTrack;
  }

  @Nullable
  private VideoTrack createVideoTrack(VideoCapturer capturer) {
    surfaceTextureHelper =
        SurfaceTextureHelper.create("CaptureThread", rootEglBase.getEglBaseContext());
    videoSource = factory.createVideoSource(capturer.isScreencast());
    capturer.initialize(surfaceTextureHelper, appContext, videoSource.getCapturerObserver());
    capturer.startCapture(videoWidth, videoHeight, videoFps);

    localVideoTrack = factory.createVideoTrack(VIDEO_TRACK_ID, videoSource);
    localVideoTrack.setEnabled(renderVideo);
    if(localRender!= null) {
      localVideoTrack.addSink(localRender);
    }
    return localVideoTrack;
  }

  private void findVideoSender() {
    for (RtpSender sender : peerConnection.getSenders()) {
      if (sender.track() != null) {
        String trackType = sender.track().kind();
        if (trackType.equals(VIDEO_TRACK_TYPE)) {
          Log.d(TAG, "Found video sender.");
          localVideoSender = sender;
        }
      }
    }
  }

  // Returns the remote VideoTrack, assuming there is only one.
  private @Nullable VideoTrack getRemoteVideoTrack() {
    for (RtpTransceiver transceiver : peerConnection.getTransceivers()) {
      MediaStreamTrack track = transceiver.getReceiver().track();
      if (track instanceof VideoTrack) {
        return (VideoTrack) track;
      }
    }
    return null;
  }

  // Returns the remote VideoTrack, assuming there is only one.
  private @Nullable AudioTrack getRemoteAudioTrack() {
    for (RtpTransceiver transceiver : peerConnection.getTransceivers()) {
      MediaStreamTrack track = transceiver.getReceiver().track();
      if (track instanceof AudioTrack) {
        return (AudioTrack) track;
      }
    }
    return null;
  }

  private static String getSdpVideoCodecName(PeerConnectionParameters parameters) {
    switch (parameters.videoCodec) {
      case VIDEO_CODEC_VP8:
        return VIDEO_CODEC_VP8;
      case VIDEO_CODEC_VP9:
        return VIDEO_CODEC_VP9;
      case VIDEO_CODEC_H264_HIGH:
      case VIDEO_CODEC_H264_BASELINE:
        return VIDEO_CODEC_H264;
      default:
        return VIDEO_CODEC_VP8;
    }
  }

  private static String getFieldTrials(PeerConnectionParameters peerConnectionParameters) {
    String fieldTrials = "";

    if (peerConnectionParameters.videoFlexfecEnabled) {
      fieldTrials += VIDEO_FLEXFEC_FIELDTRIAL;
      Log.d(TAG, "Enable FlexFEC field trial.");
    }
    fieldTrials += VIDEO_VP8_INTEL_HW_ENCODER_FIELDTRIAL;
    if (peerConnectionParameters.disableWebRtcAGCAndHPF) {
      fieldTrials += DISABLE_WEBRTC_AGC_FIELDTRIAL;
      Log.d(TAG, "Disable WebRTC AGC field trial.");
    }

    fieldTrials += "WebRTC-SpsPpsIdrIsH264Keyframe/Enabled/";
    return fieldTrials;
  }

  @SuppressWarnings("StringSplitter")
  private static String setStartBitrate(
      String codec, boolean isVideoCodec, String sdpDescription, int bitrateKbps) {
    String[] lines = sdpDescription.split("\r\n");
    int rtpmapLineIndex = -1;
    boolean sdpFormatUpdated = false;
    String codecRtpMap = null;
    // Search for codec rtpmap in format
    // a=rtpmap:<payload type> <encoding name>/<clock rate> [/<encoding parameters>]
    String regex = "^a=rtpmap:(\\d+) " + codec + "(/\\d+)+[\r]?$";
    Pattern codecPattern = Pattern.compile(regex);
    for (int i = 0; i < lines.length; i++) {
      Matcher codecMatcher = codecPattern.matcher(lines[i]);
      if (codecMatcher.matches()) {
        codecRtpMap = codecMatcher.group(1);
        rtpmapLineIndex = i;
        break;
      }
    }
    if (codecRtpMap == null) {
      Log.w(TAG, "No rtpmap for " + codec + " codec");
      return sdpDescription;
    }
    Log.d(TAG, "Found " + codec + " rtpmap " + codecRtpMap + " at " + lines[rtpmapLineIndex]);

    // Check if a=fmtp string already exist in remote SDP for this codec and
    // update it with new bitrate parameter.
    regex = "^a=fmtp:" + codecRtpMap + " \\w+=\\d+.*[\r]?$";
    codecPattern = Pattern.compile(regex);
    for (int i = 0; i < lines.length; i++) {
      Matcher codecMatcher = codecPattern.matcher(lines[i]);
      if (codecMatcher.matches()) {
        Log.d(TAG, "Found " + codec + " " + lines[i]);
        if (isVideoCodec) {
          lines[i] += "; " + VIDEO_CODEC_PARAM_START_BITRATE + "=" + bitrateKbps;
        } else {
          lines[i] += "; " + AUDIO_CODEC_PARAM_BITRATE + "=" + (bitrateKbps * 1000);
        }
        //Log.d(TAG, "Update remote SDP line: " + lines[i]);
        sdpFormatUpdated = true;
        break;
      }
    }

    StringBuilder newSdpDescription = new StringBuilder();
    for (int i = 0; i < lines.length; i++) {
      newSdpDescription.append(lines[i]).append("\r\n");
      // Append new a=fmtp line if no such line exist for a codec.
      if (!sdpFormatUpdated && i == rtpmapLineIndex) {
        String bitrateSet;
        if (isVideoCodec) {
          bitrateSet =
              "a=fmtp:" + codecRtpMap + " " + VIDEO_CODEC_PARAM_START_BITRATE + "=" + bitrateKbps;
        } else {
          bitrateSet = "a=fmtp:" + codecRtpMap + " " + AUDIO_CODEC_PARAM_BITRATE + "="
              + (bitrateKbps * 1000);
        }
        //Log.d(TAG, "Add remote SDP line: " + bitrateSet);
        newSdpDescription.append(bitrateSet).append("\r\n");
      }
    }
    return newSdpDescription.toString();
  }

  /** Returns the line number containing "m=audio|video", or -1 if no such line exists. */
  private static int findMediaDescriptionLine(boolean isAudio, String[] sdpLines) {
    final String mediaDescription = isAudio ? "m=audio " : "m=video ";
    for (int i = 0; i < sdpLines.length; ++i) {
      if (sdpLines[i].startsWith(mediaDescription)) {
        return i;
      }
    }
    return -1;
  }

  private static String joinString(
      Iterable<? extends CharSequence> s, String delimiter, boolean delimiterAtEnd) {
    Iterator<? extends CharSequence> iter = s.iterator();
    if (!iter.hasNext()) {
      return "";
    }
    StringBuilder buffer = new StringBuilder(iter.next());
    while (iter.hasNext()) {
      buffer.append(delimiter).append(iter.next());
    }
    if (delimiterAtEnd) {
      buffer.append(delimiter);
    }
    return buffer.toString();
  }

  private static @Nullable String movePayloadTypesToFront(
      List<String> preferredPayloadTypes, String mLine) {
    // The format of the media description line should be: m=<media> <port> <proto> <fmt> ...
    final List<String> origLineParts = Arrays.asList(mLine.split(" "));
    if (origLineParts.size() <= 3) {
      Log.e(TAG, "Wrong SDP media description format: " + mLine);
      return null;
    }
    final List<String> header = origLineParts.subList(0, 3);
    final List<String> unpreferredPayloadTypes =
        new ArrayList<>(origLineParts.subList(3, origLineParts.size()));
    unpreferredPayloadTypes.removeAll(preferredPayloadTypes);
    // Reconstruct the line with |preferredPayloadTypes| moved to the beginning of the payload
    // types.
    final List<String> newLineParts = new ArrayList<>();
    newLineParts.addAll(header);
    newLineParts.addAll(preferredPayloadTypes);
    newLineParts.addAll(unpreferredPayloadTypes);
    return joinString(newLineParts, " ", false /* delimiterAtEnd */);
  }

  private static String preferCodec(String sdpDescription, String codec, boolean isAudio) {
    final String[] lines = sdpDescription.split("\r\n");
    final int mLineIndex = findMediaDescriptionLine(isAudio, lines);
    if (mLineIndex == -1) {
      Log.w(TAG, "No mediaDescription line, so can't prefer " + codec);
      return sdpDescription;
    }
    // A list with all the payload types with name |codec|. The payload types are integers in the
    // range 96-127, but they are stored as strings here.
    final List<String> codecPayloadTypes = new ArrayList<>();
    // a=rtpmap:<payload type> <encoding name>/<clock rate> [/<encoding parameters>]
    final Pattern codecPattern = Pattern.compile("^a=rtpmap:(\\d+) " + codec + "(/\\d+)+[\r]?$");
    for (String line : lines) {
      Matcher codecMatcher = codecPattern.matcher(line);
      if (codecMatcher.matches()) {
        codecPayloadTypes.add(codecMatcher.group(1));
      }
    }
    if (codecPayloadTypes.isEmpty()) {
      Log.w(TAG, "No payload types with name " + codec);
      return sdpDescription;
    }

    final String newMLine = movePayloadTypesToFront(codecPayloadTypes, lines[mLineIndex]);
    if (newMLine == null) {
      return sdpDescription;
    }
    Log.d(TAG, "Change media description from: " + lines[mLineIndex] + " to " + newMLine);
    lines[mLineIndex] = newMLine;
    return joinString(Arrays.asList(lines), "\r\n", true /* delimiterAtEnd */);
  }

  private void drainCandidates() {
    if (queuedRemoteCandidates != null) {
      Log.d(TAG, "Add " + queuedRemoteCandidates.size() + " remote candidates");
      for (IceCandidate candidate : queuedRemoteCandidates) {
        peerConnection.addIceCandidate(candidate);
      }
      queuedRemoteCandidates = null;
    }
  }

  private void switchCameraInternal() {
    if (videoCapturer instanceof CameraVideoCapturer) {
      if (!isVideoCallEnabled() || isError) {
        Log.e(TAG,
            "Failed to switch camera. Video: " + isVideoCallEnabled() + ". Error : " + isError);
        return; // No video is sent or only one camera is available or error happened.
      }
      Log.d(TAG, "Switch camera");
      CameraVideoCapturer cameraVideoCapturer = (CameraVideoCapturer) videoCapturer;
      cameraVideoCapturer.switchCamera(null);
    } else {
      Log.d(TAG, "Will not switch camera, video caputurer is not a camera");
    }
  }

  public void switchCamera() {
    executor.execute(this ::switchCameraInternal);
  }

  public void changeCaptureFormat(final int width, final int height, final int framerate) {
    executor.execute(() -> changeCaptureFormatInternal(width, height, framerate));
  }

  private void changeCaptureFormatInternal(int width, int height, int framerate) {
    if (!isVideoCallEnabled() || isError || videoCapturer == null) {
      Log.e(TAG,
          "Failed to change capture format. Video: " + isVideoCallEnabled()
              + ". Error : " + isError);
      return;
    }
    Log.d(TAG, "changeCaptureFormat: " + width + "x" + height + "@" + framerate);
    videoSource.adaptOutputFormat(width, height, framerate);
  }

  // Implementation detail: observe ICE & stream changes and react accordingly.
  private class PCObserver implements PeerConnection.Observer {
    @Override
    public void onIceCandidate(final IceCandidate candidate) {
        executor.execute(() -> events.onIceCandidate(candidate));
    }

    @Override
    public void onIceCandidatesRemoved(final IceCandidate[] candidates) {
      executor.execute(() -> events.onIceCandidatesRemoved(candidates));
    }

    @Override
    public void onSignalingChange(PeerConnection.SignalingState newState) {
      Log.d(TAG, "SignalingState: " + newState);
    }
    @Override
    public void onIceConnectionChange(final PeerConnection.IceConnectionState newState) {
      executor.execute(() -> {
        Log.d(TAG, "IceConnectionState: " + newState);
        if (newState == IceConnectionState.CONNECTED) {
          events.onIceConnected();
        } else if (newState == IceConnectionState.DISCONNECTED) {
          events.onIceDisconnected();
        } else if (newState == IceConnectionState.FAILED) {
          reportError("ICE connection failed.");
        }
      });
    }

    @Override
    public void onConnectionChange(final PeerConnection.PeerConnectionState newState) {
      executor.execute(() -> {
        Log.d(TAG, "PeerConnectionState: " + newState);
        if (newState == PeerConnectionState.CONNECTED) {
          isConnected = true;
          events.onConnected();
        } else if (newState == PeerConnectionState.DISCONNECTED) {
          isConnected = false;
          events.onDisconnected();
        } else if (newState == PeerConnectionState.FAILED) {
          isConnected = false;
          reportError("DTLS connection failed.");
        }
      });
    }

    @Override
    public void onIceGatheringChange(PeerConnection.IceGatheringState newState) {
      Log.d(TAG, "IceGatheringState: " + newState);
    }

    @Override
    public void onIceConnectionReceivingChange(boolean receiving) {
      Log.d(TAG, "IceConnectionReceiving changed to " + receiving);
    }

    @Override
    public void onSelectedCandidatePairChanged(CandidatePairChangeEvent event) {
      Log.d(TAG, "Selected candidate pair changed because: " + event);
    }

    @Override
    public void onAddStream(final MediaStream stream) {
      Log.d(TAG, "onAddStream " );
    }

    @Override
    public void onRemoveStream(final MediaStream stream) {
      Log.d(TAG, "onRemoveStream " );
    }

    @Override
    public void onDataChannel(final DataChannel dc) {
      Log.e(TAG, "---------------------------New Data channel ----------------------" + dc.label());
      if (!dataChannelEnabled)
        return;
      dataChannel = dc;

      dc.registerObserver(new DataChannel.Observer() {
        @Override
        public void onBufferedAmountChange(long previousAmount) {
        //  Log.e(TAG, "Data channel buffered amount changed: " + dc.label() + ": " + dc.state());
        }

        @Override
        public void onStateChange() {
         // Log.e(TAG, "Data channel state changed: " + dc.label() + ": " + dc.state());
          events.onDataChennelState(dc.id(),dataChannelStateString(dc.state()));
        }

        @Override
        public void onMessage(final DataChannel.Buffer buffer) {
          byte[] bytes;
          if (buffer.data.hasArray()) {
            bytes = buffer.data.array();
          } else {
            bytes = new byte[buffer.data.remaining()];
            buffer.data.get(bytes);
          }
          if (buffer.binary) {
            events.onDataChennelRecvRaw(dc.id(),bytes);
          }else{
            events.onDataChennelRecvText(dc.id(),new String(bytes, Charset.forName("UTF-8")));
          }
        }
      });
    }

    @Override
    public void onRenegotiationNeeded() {
      // No need to do anything; AppRTC follows a pre-agreed-upon
      // signaling/negotiation protocol.
      //Log.d(TAG, "onRenegotiationNeeded " );
    }

    @Override
    public void onAddTrack(final RtpReceiver receiver, final MediaStream[] mediaStreams) {

      MediaStreamTrack track =receiver.track();
      if (track instanceof VideoTrack) {
        VideoTrack vtrack  = (VideoTrack)track;
        Log.e(TAG, "onAddTrack --------------------------------- "+vtrack.toString());
        remoteVideoTrack = vtrack;
        if(remoteSinks!= null) {
          vtrack.addSink(remoteSinks);
        }
        if(remoteSaveSink!= null) {
          vtrack.addSink(remoteSaveSink);
        }
      }

    }
  }

  // Implementation detail: handle offer creation/signaling and answer setting,
  // as well as adding remote ICE candidates once the answer SDP is set.
  private class SDPObserver implements SdpObserver {
    @Override
    public void onCreateSuccess(final SessionDescription origSdp) {
     // Log.d(TAG, "SDPObserver::onCreateSuccess"+origSdp.description);
      if (localSdp != null) {
        reportError("Multiple SDP create.");
        return;
      }
      String sdpDescription = origSdp.description;
      if (preferIsac) {
        sdpDescription = preferCodec(sdpDescription, AUDIO_CODEC_ISAC, true);
      }
      if (isVideoCallEnabled()) {
        sdpDescription =
            preferCodec(sdpDescription, getSdpVideoCodecName(peerConnectionParameters), false);
      }
      final SessionDescription sdp = new SessionDescription(origSdp.type, sdpDescription);
      localSdp = sdp;
      executor.execute(() -> {
        if (peerConnection != null && !isError) {
        //  Log.d(TAG, "Set local SDP from " + sdp.type);
          peerConnection.setLocalDescription(sdpObserver, sdp);
        }
      });
    }

    @Override
    public void onSetSuccess() {
      executor.execute(() -> {
        if (peerConnection == null || isError) {
          return;
        }
        if (isInitiator) {
          // For offering peer connection we first create offer and set
          // local SDP, then after receiving answer set remote SDP.
          if (peerConnection.getRemoteDescription() == null) {
            // We've just set our local SDP so time to send it.
            //Log.d(TAG, "Local SDP set succesfully");
            events.onLocalDescription(localSdp);
          } else {
            // We've just set remote description, so drain remote
            // and send local ICE candidates.
           // Log.d(TAG, "Remote SDP set succesfully");
            drainCandidates();
          }
        } else {
          // For answering peer connection we set remote SDP and then
          // create answer and set local SDP.
          if (peerConnection.getLocalDescription() != null) {
            // We've just set our local SDP so time to send it, drain
            // remote and send local ICE candidates.
            //Log.d(TAG, "Local SDP set succesfully");
            events.onLocalDescription(localSdp);
            drainCandidates();
          } else {
            // We've just set remote SDP - do nothing for now -
            // answer will be created soon.
            //Log.d(TAG, "Remote SDP set succesfully");
          }
        }
      });
    }

    @Override
    public void onCreateFailure(final String error) {
      reportError("createSDP error: " + error);
    }

    @Override
    public void onSetFailure(final String error) {
      reportError("setSDP error: " + error);
    }
  }
}
