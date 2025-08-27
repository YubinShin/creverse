export interface AiChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
