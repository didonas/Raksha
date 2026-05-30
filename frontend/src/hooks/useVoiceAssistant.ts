import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
}

interface VoiceAssistantState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  language: string;
}

export function useVoiceAssistant(commands: VoiceCommand[] = []) {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    error: null,
    isSupported: false,
    language: 'en-IN',
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition && !!window.speechSynthesis;

    setState((prev) => ({ ...prev, isSupported: supported }));

    if (supported) {
      synthRef.current = window.speechSynthesis;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState((prev) => ({ ...prev, isListening: true, error: null }));
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setState((prev) => ({ ...prev, transcript }));

        if (event.results[0].isFinal) {
          processCommand(transcript.toLowerCase());
        }
      };

      recognition.onerror = (event: any) => {
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: `Voice error: ${event.error}`,
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({ ...prev, isListening: false }));
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, []);

  const processCommand = useCallback(
    (transcript: string) => {
      const matched = commands.find((cmd) =>
        transcript.includes(cmd.command.toLowerCase())
      );
      if (matched) {
        matched.action();
        speak(`Executing: ${matched.description}`);
      }
    },
    [commands]
  );

  const startListening = useCallback(() => {
    if (!recognitionRef.current || state.isListening) return;
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('[Voice] Start error:', err);
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  const speak = useCallback((text: string, lang?: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setState((prev) => ({ ...prev, isSpeaking: true }));
    utterance.onend = () => setState((prev) => ({ ...prev, isSpeaking: false }));
    utterance.onerror = () => setState((prev) => ({ ...prev, isSpeaking: false }));

    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, []);

  const speakEmergencyInstructions = useCallback(
    (emergencyType: string) => {
      const instructions: Record<string, string> = {
        Cardiac:
          'Cardiac emergency detected. Call 108 immediately. Begin CPR if the person is unresponsive. Push hard and fast in the center of the chest.',
        Breathing:
          'Breathing difficulty detected. Keep the person calm and upright. Loosen tight clothing. Call 108 immediately.',
        Bleeding:
          'Severe bleeding detected. Apply firm pressure to the wound. Do not remove the cloth. Keep pressure until help arrives.',
        Accident:
          'Accident detected. Do not move the person unless in immediate danger. Call 108. Keep them still and calm.',
        Stroke:
          'Possible stroke. Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 108.',
        Seizure:
          'Seizure detected. Clear the area. Do not restrain the person. Time the seizure. Call 108 if it lasts more than 5 minutes.',
        Burns:
          'Burns detected. Cool the burn with running water for 20 minutes. Do not use ice. Cover loosely. Call 108.',
        Poisoning:
          'Poisoning detected. Do not induce vomiting. Call 108 immediately. Keep the person calm.',
        General:
          'Emergency detected. Stay calm. Help is on the way. Keep the person still and comfortable.',
      };

      const instruction = instructions[emergencyType] || instructions.General;
      speak(instruction);
    },
    [speak]
  );

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    speakEmergencyInstructions,
    toggleListening: state.isListening ? stopListening : startListening,
  };
}

export default useVoiceAssistant;
