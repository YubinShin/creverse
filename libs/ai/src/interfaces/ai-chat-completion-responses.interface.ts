export interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
