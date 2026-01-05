
export enum VoiceName {
  Kore = 'Kore',
  Zephyr = 'Zephyr',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir'
}

export interface HistoryItem {
  id: string;
  text: string;
  voice: VoiceName;
  timestamp: number;
  audioBlob: Blob;
  audioUrl: string;
}

export interface SpeechConfig {
  voice: VoiceName;
  speed?: number;
}
