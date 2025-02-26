export type Data = unknown[] | Record<string, unknown>;

export interface Error {
  /** Code displayed in the error screen */
  code: string;
  /** Message describing the error */
  message: string;
  /** Source of the error */
  source: string;
}

interface ExportOptions extends Options {
  /** The id of the currently running export. */
  _exportId: string;
}

interface ImportOptions extends Options {
  /** The id fo the currently running import. */
  _importId: string;
}

interface Job {
  /** The id of the job. */
  _id: string;
  /** The type of the job. */
  type: string;
  /** The time the job started. */
  startedAt: string;
  /** The parent job */
  parentJob?: Job;
}

interface Options {
  /** The id of the currently running connection. */
  _connectionId: string;
  /** The id of the currently running flow. */
  _flowId: string;
  /** The id of the currently running integration. */
  _integrationId: string;
  /** All custom settings in scope for the currently running export. */
  settings: Record<string, unknown>;
  /** The job currently runing */
  job: Job;
  /** A flag that executes scripts only on test mode and preview/send actions. */
  testMode: boolean;
}

export namespace EntryPoints {
  namespace PreSavePage {
    interface PreSavePageError extends Error {
      retryDataKey: string;
    }

    interface File {
      /** Meta information about the file. */
      fileMeta: FileMeta
    }

    interface FileMeta {
      /** The name of the file */
      filename: string;
    }

    type Options = BaseOptions | FileOptions | DeltaOptions
    interface BaseOptions extends ExportOptions {
      /** An array of records representing one page of data. */
      data: Data[]
      /** An array of errors. */
      errors: PreSavePageError[],
      /** A object containing the retry data for all errors. */
      retryData: { [retryDataKey: string]: { data: Data, stage: string, traceKey: string } };
      /** Current page of the batch export currently running. */
      pageIndex: number;
    }

    interface FileOptions extends BaseOptions {
      /** Each file contains information about the file relating to the same index in the data. */
      files: File[]
    }

    interface DeltaOptions extends BaseOptions {
      /** The last time the export was executed. */
      lastExportDateTime: string;
      /** The time of the export currently running. */
      currentExportDateTime: string;
    }

    interface Response {
      /** The modified data. */
      data: Data[];
      /** The modified errors. NOTE: to not add new errors here. */
      errors: PreSavePageError[];
      /** Instruct the batch export to stop generating new pages of data */
      abort: boolean;
      /** New Errors linked to retry data. */
      newErrorsAndRetryData: [{ retryData: Data, errors: PreSavePageError[] }];
    }
  }

  namespace PreMap {
    interface Options extends ImportOptions {
      /** An array of records representing a page of data before it has been mapped. */
      data: Data[]
    }

    /**
     */
    interface Response {
      /** The modified/unmodified record that should be passed along for processing. */
      data?: Data;
      /** Used to report one or more errors for the specific record */
      errors?: Error;
    }
  }

  /**
   * The preSavePage hook is invoked on a page of records before the page is sent to subsequent steps in your flow. 
   *
   * This hook can be used to add, update or delete records. This hook is a great place
   * to execute logic on batches of records at the same time.
   *
   * Throwing an expection will signal a fatal error and stop the flow.
   */
  type preSavePage = (options: PreSavePage.Options) => PreSavePage.Response;


  /**
   * The preMap hook is invoked on a page of records before the records are mapped from source to destination structures.
   *
   * This hook can be used to validate, update, or ignore records before mapping rules are run. Changes made to records in this
   * hook are localized and will not get passed along to subsequent steps in the flow.
   *
   * This hook is a great place to execute logic on batches of records to optimize visual field mapping.
   *
   * The function needs to return an array, and the length MUST match the options.data array length.
   * Each element in the array represents the actions that should be taken on the record at that index.
   * Returning an empty object for a specific record will indicate that the record should be ignored.
   * Returning both 'data' and 'errors' for a specific record will indicate that the record should be processed but errors should also be logged.
   *
   * Throwing an exception will fail the entire page of records.
   */
  type preMap = (options: PreMap.Options) => PreMap.Response[];
}


