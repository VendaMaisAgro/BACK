import { Request, Response, RequestHandler } from 'express';
import { TransportTypesService } from './transport-types.service';

const service = new TransportTypesService();

export class TransportTypesController {

	public create: RequestHandler = async (
		req: Request,
		res: Response
	): Promise<void> => {
		try {
			const result = await service.create(req.body);
			res.status(201).json(result);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error:
					'Falha ao criar o tipo de transporte, por favor tente novamente.',
			});
		}
	};

	public getAll: RequestHandler = async (
		req: Request,
		res: Response
	): Promise<void> => {
		try {
			const result = await service.getAll();
			res.json(result);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error:
					'Falha ao buscar os tipos de transporte, por favor tente novamente.',
			});
		}
	};

	public getById: RequestHandler = async (
		req: Request,
		res: Response
	): Promise<void> => {
		const id = req.params.id;
		try {
			const result = await service.getById(id.toString());
			if (!result) {
				res.status(404).json({
					error: 'Tipo de transporte não encontrado.',
				});
				return;
			}
			res.json(result);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error:
					'Falha ao buscar o tipo de transporte, por favor tente novamente.',
			});
		}
	};
	public update: RequestHandler = async (
		req: Request,
		res: Response
	): Promise<void> => {
		const id = req.params.id;
		try {
			const result = await service.update(id.toString(), req.body);
			res.json(result);
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error:
					'Falha ao atualizar o tipo de transporte, por favor tente novamente.',
			});
		}
	};

	public delete: RequestHandler = async (
		req: Request,
		res: Response
	): Promise<void> => {
		const id = req.params.id; 
		try {
			await service.delete(id.toString());
			res.status(204).send();
		} catch (error: any) {
			console.error(error);
			res.status(500).json({
				error:
					'Falha ao deletar o tipo de transporte, por favor tente novamente.',
			});
		}
	};
}
