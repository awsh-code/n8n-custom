import { WaitTracker } from '@/WaitTracker';
import { mock } from 'jest-mock-extended';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/Interfaces';
import type { OrchestrationService } from '@/services/orchestration.service';
import type { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';

jest.useFakeTimers();

describe('WaitTracker', () => {
	const executionRepository = mock<ExecutionRepository>();
	const orchestrationService = mock<OrchestrationService>({
		isSingleMainSetup: true,
	});

	const execution = mock<IExecutionResponse>({
		id: '123',
		waitTill: new Date(Date.now() + 1000),
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor()', () => {
		it('should query DB for waiting executions', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([execution]);

			new WaitTracker(mock(), executionRepository, mock(), mock(), orchestrationService);

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			new WaitTracker(mock(), executionRepository, mock(), mock(), orchestrationService);

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});

		describe('if execution to start', () => {
			it('if not enough time passed, should not start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				const waitTracker = new WaitTracker(
					mock(),
					executionRepository,
					mock(),
					mock(),
					orchestrationService,
				);

				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				await waitTracker.getWaitingExecutions();

				const startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');

				jest.advanceTimersByTime(100);

				expect(startExecutionSpy).not.toHaveBeenCalled();
			});

			it('if enough time passed, should start execution', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				const waitTracker = new WaitTracker(
					mock(),
					executionRepository,
					mock(),
					mock(),
					orchestrationService,
				);

				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				await waitTracker.getWaitingExecutions();

				const startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');

				jest.advanceTimersByTime(2_000);

				expect(startExecutionSpy).toHaveBeenCalledWith(execution.id);
			});
		});
	});

	describe('startExecution()', () => {
		it('should query for execution to start', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			const waitTracker = new WaitTracker(
				mock(),
				executionRepository,
				mock(),
				mock(),
				orchestrationService,
			);

			executionRepository.findSingleExecution.mockResolvedValue(execution);
			waitTracker.startExecution(execution.id);
			jest.advanceTimersByTime(5);

			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(execution.id, {
				includeData: true,
				unflattenData: true,
			});
		});
	});

	describe('single-main setup', () => {
		it('should start tracking', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			new WaitTracker(mock(), executionRepository, mock(), mock(), orchestrationService);

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
	});

	describe('multi-main setup', () => {
		it('should start tracking if leader', () => {
			const orchestrationService = mock<OrchestrationService>({
				isLeader: true,
				isSingleMainSetup: false,
				multiMainSetup: mock<MultiMainSetup>({ on: jest.fn().mockReturnThis() }),
			});

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			new WaitTracker(mock(), executionRepository, mock(), mock(), orchestrationService);

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('should not start tracking if follower', () => {
			const orchestrationService = mock<OrchestrationService>({
				isLeader: false,
				isSingleMainSetup: false,
				multiMainSetup: mock<MultiMainSetup>({ on: jest.fn().mockReturnThis() }),
			});

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			new WaitTracker(mock(), executionRepository, mock(), mock(), orchestrationService);

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});