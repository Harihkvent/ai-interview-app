import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceControllerProps {
  onTranscriptComplete: (transcript: string) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  autoStart?: boolean;
}

export const useVoiceController = ({
  onTranscriptComplete,
  onSpeakingStateChange,
}: VoiceControllerProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const hasSubmittedRef = useRef(false);
  const isListeningRef = useRef(false);
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
          console.log('Final transcript:', transcript);
        } else {
          interim += transcript;
        }
      }
      
      setInterimTranscript(interim);

      // Reset silence timer on each speech detection
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Auto-stop after 2 seconds of silence
      silenceTimerRef.current = window.setTimeout(() => {
        console.log('Silence detected, stopping listening...');
        const finalText = finalTranscriptRef.current.trim();
        
        // Stop recognition first
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.error('Error stopping recognition:', e);
          }
        }
        
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        
        // Submit the answer if we have text and haven't submitted yet
        if (finalText && !hasSubmittedRef.current) {
          console.log('Submitting answer from silence timer:', finalText);
          hasSubmittedRef.current = true;
          onTranscriptCompleteRef.current(finalText);  // Use ref here
        }
        
        finalTranscriptRef.current = '';
      }, 4000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // User didn't speak, auto-stop
        stopListening();
      } else if (event.error === 'aborted') {
        // Recognition was aborted, this is normal
        console.log('Recognition aborted (normal)');
      } else {
        // Other errors
        console.error('Recognition error:', event.error);
        stopListening();
      }
    };

    recognition.onend = () => {
      console.log('Recognition ended');
      isListeningRef.current = false;
      setIsListening(false);
      
      // Clear the silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // If we have a transcript and haven't submitted yet, submit it
      const finalText = finalTranscriptRef.current.trim();
      if (finalText && !hasSubmittedRef.current) {
        console.log('Recognition ended with transcript, submitting:', finalText);
        hasSubmittedRef.current = true;
        onTranscriptCompleteRef.current(finalText);  // Use ref here
      }
      
      finalTranscriptRef.current = '';
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      // Stop any ongoing speech synthesis
      window.speechSynthesis.cancel();
    };
  }, []);  // Remove onTranscriptComplete from dependencies

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      console.log('Cannot start listening: recognition not available');
      return;
    }

    // Use ref instead of state to avoid stale closure issues
    if (isListeningRef.current) {
      console.log('Already listening (ref check), skipping start');
      return;
    }

    // CRITICAL: Reset these flags BEFORE starting recognition
    finalTranscriptRef.current = '';
    hasSubmittedRef.current = false; // Reset submission flag
    setInterimTranscript('');
    
    try {
      console.log('Starting speech recognition... (hasSubmittedRef reset to false)');
      recognitionRef.current.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (error: any) {
      // If already started, ignore the error
      if (error.message && error.message.includes('already started')) {
        console.log('Recognition already started, but flags are reset');
        isListeningRef.current = true;
        setIsListening(true);
      } else {
        console.error('Error starting recognition:', error);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, []);

  // Helper to get a male English voice
  const selectMaleVoice = useCallback((voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    return voices.find(v => 
      (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')) && 
      v.lang.includes('en')
    ) || voices.find(v => 
      v.name.includes('Google') && v.lang.includes('en-US')
    ) || voices.find(v => 
      v.lang.includes('en-US')
    ) || voices.find(v => 
      v.lang.includes('en')
    ) || null;
  }, []);

  // Ensure voices are loaded (returns a promise)
  const ensureVoicesLoaded = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      // Voices not yet loaded — wait for the event
      const handler = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          window.speechSynthesis.removeEventListener('voiceschanged', handler);
          resolve(v);
        }
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Safety timeout: if voices never load, resolve with empty after 2s
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices());
      }, 2000);
    });
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      console.error('Speech Synthesis not supported');
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Wait for voices to be available
    const voices = await ensureVoicesLoaded();
    console.log(`[VoiceController] ${voices.length} voices available`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 0.9; // Slightly lower pitch for male voice
    utterance.volume = 1.0;

    const maleVoice = selectMaleVoice(voices);
    if (maleVoice) {
      utterance.voice = maleVoice;
      console.log('Using voice:', maleVoice.name);
    } else {
      console.warn('No male voice found, using browser default');
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakingStateChange?.(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakingStateChange?.(false);
      
      // Call the onEnd callback immediately without auto-starting listening
      // Listening will be manually controlled by the caller
      onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      onSpeakingStateChange?.(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [ensureVoicesLoaded, selectMaleVoice, onSpeakingStateChange]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    onSpeakingStateChange?.(false);
  }, [onSpeakingStateChange]);

  return {
    isListening,
    isSpeaking,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
};
