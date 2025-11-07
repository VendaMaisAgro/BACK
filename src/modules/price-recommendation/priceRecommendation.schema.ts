import { z } from 'zod';

export const getByNameParamsSchema = z.object({
  productName: z
    .string()
    .nonempty('productName é obrigatório')
    .min(2, 'productName deve ter ao menos 2 caracteres')
    // permite letras (com acento), números, espaço, hífen, parênteses, barra, ponto, vírgula, º, ª e °
    .regex(/^[\p{L}\p{N}\s\-\(\)\/\.,ºª°]+$/u, 'productName contém caracteres não permitidos'),
});
