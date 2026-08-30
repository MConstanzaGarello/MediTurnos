export interface LoginInput {
  email: string;
  password: string;
}

export type LoginField = keyof LoginInput;

export type LoginErrors = Partial<Record<LoginField, string>>;