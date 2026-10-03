import Queue from 'better-queue'

export type QueueProcessor<Task, Result> = (
  task: Task,
  done: (error: Error | null, result?: Result) => void
) => void

export type QueueOptions = {
  maxAttempts?: number
  retryDelay?: number
}

/** Initialize once in the Node/Electron persistence layer, outside React renders. */
export class TaskQueue<Task, Result = unknown> {
  private readonly queue: Queue<Task, Result>

  constructor(
    process: QueueProcessor<Task, Result>,
    options: QueueOptions = {}
  ) {
    this.queue = new Queue<Task, Result>(process, {
      store: 'memory',
      concurrent: 1,
      batchSize: 1,
      // better-queue 3.8.12 counts total attempts under the maxRetries option.
      maxRetries: options.maxAttempts ?? 3,
      retryDelay: options.retryDelay ?? 500,
    })
  }

  /** Resolves when the task finishes; rejects after its retry limit is exhausted. */
  enqueue(task: Task): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      this.queue.push(task, (error: unknown, result: Result) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
          return
        }
        resolve(result)
      })
    })
  }
}
