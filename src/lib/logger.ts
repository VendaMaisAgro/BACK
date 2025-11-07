export const logger = {
  info: (..._args: any[]) => {},
  warn: (..._args: any[]) => {},
  // mantém erros visíveis
  error: (...args: any[]) => console.error(...args),
};
