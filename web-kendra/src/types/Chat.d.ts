export type Role = 'user' | 'assistant';
export type Message = {
  role: Role;
  content: string;
  references?: {
    title: string;
    uri: string;
  }[];
};
