export interface Quiz {
  question: string;
  options: string[];
  answer: string;
}

export interface StoryParagraph {
  paragraph: string;
  imagePrompt: string;
  quiz?: Quiz;
  imageUrl?: string;
}

export interface StoryData {
  title: string;
  learningOutcomes: string[];
  story: StoryParagraph[];
}

export interface GenerateRequest {
  lessonText: string;
  universe: string;
}

export interface ExtractResponse {
  text: string;
}

export type UploadType = 'file' | 'url' | 'youtube';
