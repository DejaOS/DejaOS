package com.rhrtc.webrtc;

import android.media.AudioRecord;

import org.webrtc.audio.JavaAudioDeviceModule;


public class AudioSample {
    /** See {@link AudioRecord#getAudioFormat()} */
    private final int audioFormat;
    private final int channelCount;
    private final int sampleRate;

    private final byte[] data;

    public AudioSample(int audioFormat, int channelCount, int sampleRate, byte[] data) {
        this.audioFormat = audioFormat;
        this.channelCount = channelCount;
        this.sampleRate = sampleRate;
        this.data = data;
    }

    public int getAudioFormat() {
        return audioFormat;
    }

    public int getChannelCount() {
        return channelCount;
    }

    public int getSampleRate() {
        return sampleRate;
    }

    public byte[] getData() {
        return data;
    }
}
