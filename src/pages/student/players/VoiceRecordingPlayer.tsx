import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Activity } from '../../../types';

interface VoiceRecordingPlayerProps {
  activity: Activity;
  onSubmit: (data: { audioUrl: string; duration: number }) => Promise<void>;
  submitting: boolean;
}

export const VoiceRecordingPlayer: React.FC<VoiceRecordingPlayerProps> = ({
  activity,
  onSubmit,
  submitting,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 25, 40, 20, 35, 50, 30, 25, 45, 20]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordedMimeTypeRef = useRef<string>('audio/webm');

  const maxDuration = activity.settings.maxDurationSeconds || 120;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Determine browser-supported audio mime type
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return '';
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setAudioUrl(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize audio context for real microphone waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      }

      const mimeType = getSupportedMimeType();
      recordedMimeTypeRef.current = mimeType || 'audio/webm';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = recordedMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });

        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Dynamic waveform frequency loop
      const updateWaveform = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const heights = Array.from(dataArray.slice(0, 16)).map((val) =>
            Math.max(12, Math.min(80, (val / 255) * 80))
          );
          setWaveHeights(heights);
        }
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (err: any) {
      console.error('Microphone access notice:', err);
      setErrorMessage(
        'Microphone access is required. Please grant permission in your browser settings to record your voice.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop notice:', e);
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      } else {
        audioPlayerRef.current.src = audioUrl;
      }
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => {
          console.warn('Playback notice:', e);
          setIsPlayingAudio(false);
        });
    }
  };

  const handleReset = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioUrl(null);
    setRecordingDuration(0);
    setIsRecording(false);
    setIsPlayingAudio(false);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!audioUrl) return;
    await onSubmit({ audioUrl, duration: recordingDuration });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-6 shadow-sm">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 rounded-[14px] border border-red-200">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Waveform Visualization Container */}
      <div className="h-32 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] flex items-center justify-center gap-1.5 px-4 overflow-hidden border border-[#E6E0F5] dark:border-[#2e234c]">
        {waveHeights.map((h, index) => (
          <div
            key={index}
            className={`w-2.5 rounded-full transition-all duration-100 ${
              isRecording ? 'bg-[#6D28D9]' : 'bg-[#8B5CF6]/40'
            }`}
            style={{ height: `${isRecording ? h : 16}px` }}
          />
        ))}
      </div>

      {/* Timer and Status */}
      <div className="text-center space-y-1">
        <p className="text-2xl font-mono font-bold text-[#1C1530] dark:text-white">
          {formatSeconds(recordingDuration)} / {formatSeconds(maxDuration)}
        </p>
        <p className="text-xs text-[#5B5470] dark:text-[#a49cb5]">
          {isRecording
            ? 'Recording in progress... Speak clearly into your device microphone'
            : audioUrl
            ? 'Voice recorded. Press play to review or submit your speech'
            : 'Tap the purple microphone button below to start'}
        </p>
      </div>

      {/* Recording & Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        {!audioUrl ? (
          !isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-[#6D28D9] text-white flex items-center justify-center shadow-lg shadow-purple-950/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              aria-label="Start recording"
            >
              <Mic size={28} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-950/20 animate-pulse transition-all cursor-pointer"
              aria-label="Stop recording"
            >
              <Square size={22} strokeWidth={2} fill="white" />
            </button>
          )
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-14 h-14 rounded-full bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center hover:bg-[#d8cff0] transition-colors cursor-pointer"
              aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
            >
              {isPlayingAudio ? (
                <Pause size={22} strokeWidth={2} />
              ) : (
                <Play size={22} strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-[#5B5470] dark:text-[#a49cb5] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Re-record"
              aria-label="Re-record"
            >
              <RotateCcw size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Submit Action */}
      {audioUrl && (
        <div className="pt-4 border-t border-[#E6E0F5] dark:border-[#2e234c] flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send size={16} strokeWidth={2} />
            <span>{submitting ? 'Submitting...' : 'Submit Recording'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
