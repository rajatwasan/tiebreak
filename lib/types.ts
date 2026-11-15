export interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ClarifyResult {
  label: string;
  options: string[];
  questions: ClarifyQuestion[];
  demo: boolean;
}

export interface Answer {
  question: string;
  answer: string;
}

export interface DecideRequest {
  situation: string;
  label: string;
  options: string[];
  answers: Answer[];
}
