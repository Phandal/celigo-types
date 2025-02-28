export interface Error {
  /** Code displayed in the error screen */
  code: string;
  /** Message describing the error */
  message: string;
  /** Source of the error */
  source: string;
}

interface File {
  /** Meta information about the file. */
  fileMeta: FileMeta
}

interface FileMeta {
  /** The name of the file */
  filename: string;
}

interface ImportResponse<T> {
  /** The status code from the imoprt application. */
  statusCode: number;
  /** An array of errors that happened during the import. */
  errors: ImportError[]
  /** Whether the record was skipped/filtered. */
  ignored: boolean;
  /** The id from the import application response. */
  id: string;
  /** The complete response data from the import application. */
  _json: T;
  /** A URI for the data in the import application. */
  dataURI?: string;
}

interface ImportError {
  /** Code describing the error */
  code: string;
  /** Message describing the error */
  message: string;
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
  /** The parent of the currently running integration. */
  _parentIntegrationId?: string;
  /** All custom settings in scope for the currently running export. */
  settings: Record<string, unknown>;
  /** The job currently runing */
  job: Job;
  /** A flag indicating whether the script is invoked for sandbox. */
  sandbox: boolean;
  /** A flag indicating test mode and preview. */
  testMode: boolean;
}

interface ExportOptions extends Options {
  /** The id of the currently running export. */
  _exportId: string;
}

interface ImportOptions extends Options {
  /** The id fo the currently running import. */
  _importId: string;
}

export namespace EntryPoints {

  namespace PreSavePage {
    interface error extends Error {
      retryDataKey: string;
    }

    type options<T> = standardOptions<T> | fileOptions<T> | deltaOptions<T>;

    interface standardOptions<T> extends ExportOptions {
      /** An array of records representing one page of data. */
      data: T[]
      /** An array of errors. */
      errors: error[],
      /** A object containing the retry data for all errors. */
      retryData: { [retryDataKey: string]: { data: T, stage: string, traceKey: string } };
      /** Current page of the batch export currently running. */
      pageIndex: number;
    }

    interface fileOptions<T> extends standardOptions<T> {
      /** Each file contains information about the file relating to the same index in the data. */
      files: File[]
    }

    interface deltaOptions<T> extends standardOptions<T> {
      /** The last time the export was executed. */
      lastExportDateTime: string;
      /** The time of the export currently running. */
      currentExportDateTime: string;
    }

    interface response<T> {
      /** The modified data. */
      data: T[];
      /** The modified errors. NOTE: do not add new errors here. */
      errors: error[];
      /** Instruct the batch export to stop generating new pages of data */
      abort: boolean;
      /** New Errors linked to retry data. */
      newErrorsAndRetryData: { retryData: T, errors: error[] }[];
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
  type preSavePage<T, K> = (options: PreSavePage.options<T>) => PreSavePage.response<K>;

  namespace PreMap {
    interface options<T> extends ImportOptions {
      /** An array of records representing a page of data before it has been mapped. */
      data: T[]
    }

    type response<T> = responseObject<T>[];

    interface responseObject<T> {
      /** The modified/unmodified record that should be passed along for processing. */
      data?: T;
      /** Used to report one or more errors for the specific record */
      errors?: Error;
    }
  }

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
  type preMap<T, K> = (options: PreMap.options<T>) => PreMap.response<K>;

  namespace PostMap {
    interface options<T, K> extends ImportOptions {
      /** An array of records representing the page of data before it was mapped. */
      preMapData: T[];
      /** An array of records representing the page of data after it was mapped. */
      postMapData: K[];
    }

    type response<T> = responseObject<T>[]

    interface responseObject<T> {
      /** The modified/unmodified record that should be passed along for processing. */
      data?: T;
      /** Used to report one or more errors for the specific record */
      errors?: Error;
    }
  }

  /**
   * The post map hook is invoked on a page of records after the records are mapped from source to destination structures.
   *
   * This hook can be used to validate, update, or ignore records before they are submitted to the destination application.
   * Changes made to source records in this hook will persist only for the duration of the import, and will not carry over to downstream
   * applications in your flow.
   *
   * This hook is a great place to execute logic on batches of records to optimize the final payload-building experience in Flow builder.
   *
   * The function needs to return an array, and the length MUST match the options.data array length.
   * Each element in the array represents the actions that should be taken on the record at that index.
   * Returning an empty object for a specific record will indicate that the record should be ignored.
   * Returning both 'data' and 'errors' for a specific record will indicate that the record should be processed but errors should also be logged.
   *
   * Throwing an exception will fail the entire page of records.
   */
  type postMap<T, R, K> = (options: PostMap.options<T, R>) => PostMap.response<K>;

  namespace PostSubmit {
    interface options<T, R, K> extends ImportOptions {
      /** An array of records representing the page of data before it was mapped. */
      preMapData: T[];
      /** An array of records representing the page of data after it was mapped. */
      postMapData: R[];
      /** An array of responses from the page of data that was submitted to the import application. */
      responseData: ImportResponse<K>[];
    }

    type response<T> = ImportResponse<T>[];
  }

  /**
   * The post submit hook is invoked on a page of records after the records are submitted to the destination application.
   *
   * This hook can be used to enhance error messages and/or modify the response objects returned by the destination application.
   * Changes made to the response object are localized and must be mapped back into the source record using a ‘response mapping’ to be visible in the flow.
   *
   * This hook is a great place to execute logic on batches of records to mitigate errors or to optimize response structures needed by subsequent steps in the flow
   *
   * The function needs to return the responseData array provided by options.responseData. The length of the responseData array MUST remain unchanged.
   * Elements within the responseData array can be modified to enhance error messages, modify the complete _json response data, etc...
   *
   * Throwing an exception will fail the entire page of records.
   */
  type postSubmit<T, R, K, S> = (options: PostSubmit.options<T, R, K>) => PostSubmit.response<S>;

  namespace PostResponseMap {

    interface options<T, K> extends Options {
      /** An array of records representing the page of data after response mapping is complete. */
      postResponseMapData: T
      responseData: ImportResponse<K>
      /** As configured on your export/import resource. */
      oneToMany: boolean;
      /** As configured on your export/import resource. */
      pathToMany: string;
      /** The id of the currently running export. */
      _exportId: string;
      /** The id fo the currently running import. */
      _importId: string;
    }

    type response<T> = T[];
  }

  /**
   * The post response map hook is invoked on a page of records after response or results mapping.
   *
   * This hook is a great place to execute logic on batches of records to optimize the response/results data to be merged back into the source records
   *
   * The function needs to return the postResponseMapData array provided by options.postResponseMapData.
   * The length of postResponseMapData MUST remain unchanged.  Elements within postResponseMapData can be changed however needed.
   *
   * Throwing an exception will signal a fatal error and fail the entire page of records.
  */
  type postResponseMap<T, R, K> = (options: PostResponseMap.options<T, R>) => PostResponseMap.response<K>;

  namespace PostAggregate {
    type Aggregation<T> = {
      /** Whether the aggregation was successful. */
      success: boolean;
      /** Information about the aggregated data transfer. */
      _json: T;
      /** Error code for a failed aggregate. */
      code: string;
      /** Error message for a failed aggregate. */
      message: string;
      /** Error source for a failed aggregate. */
      source: string;
    }


    interface options<T> extends ImportOptions {
      /** A container object containing the information about an aggregate. */
      postAggregateData: Aggregation<T>;
    }
  }

  /**
   * The post aggregate hook is invoked after the final aggregated file is uploaded to the destination service.
   *
   * This hook is used to get information about the final file that was aggregated and uploaded to the external destination.
   * This hook will not execute when the skip aggregation field is set to true.
   *
   * Throwing an exception will signal a fatal error.
   */
  type postAggregate<T> = (options: PostAggregate.options<T>) => void



  /*
  * filterFunction stub:
  *
  * The name of the function can be changed to anything you like.
  *
  * The function will be passed one 'options' argument that has the following fields:
  *   'record' - object {} or array [] depending on the data source.
  *   'pageIndex' - 0 based. context is the batch export currently running.
  *   'lastExportDateTime' - delta exports only.
  *   'currentExportDateTime' - delta exports only.
  *   'settings' - all custom settings in scope for the filter currently running.
  *   'testMode' - boolean flag indicating test mode and previews.
  *   'job' - the job currently running.
  *
  */

  namespace Filter {
    type options<T> = standardOptions<T> | deltaOptions<T>;

    interface standardOptions<T> {
      /** A record that was imported/exported. */
      record: T;
      /** Page of the batch export this record belongs to. */
      pageIndex: number;
      /** All custom settings in scope. */
      settings: Record<string, unknown>;
      /** A flag indicating test mode and preview. */
      testMode: boolean;
      /** The job currently runing */
      job: Job;
    }

    interface deltaOptions<T> extends standardOptions<T> {
      /** The last time the export was executed. */
      lastExportDateTime: string;
      /** The time of the export currently running. */
      currentExportDateTime: string;
    }
  }

  /**
   * The filter hook is invoked before or after an import/export has run.
   *
   * This hook is a great place to filter out records that you do not want to process.
   *
   * The function needs to return true or false.  i.e. true indicates the record should be processed.
   *
   * Throwing an exception will return an error for the record.
   */
  type filter<T> = (options: Filter.options<T>) => boolean;

  namespace Transform {
    interface options<T> {
      /** A record that was exported. */
      record: T;
      /** All custom settings in scope. */
      settings: Record<string, unknown>;
      /** A flag indicating test mode and preview. */
      testMode: boolean;
      /** The job currently runing */
      job: Job;
    }
  }

  /**
   * Transformations allow you to change your source data before it is processed by a flow.\
   * You can simplify and modify the data so it's easier for your import to understand
   *
   * The function needs to return the transformed record.
   *
   * Throwing an exception will return an error for the record.
   */
  type transform<T, K> = (options: Transform.options<T>) => K;

  namespace Branching {
    interface options<T> {
      /** A record that was exported. */
      record: T;
      /** All custom settings in scope. */
      settings: Record<string, unknown>;
      /** A flag indicating test mode and preview. */
      testMode: boolean;
    }
  }

  /**
   * Branching allows you to choose different paths for your data in the flow.
   *
   * The function needs to return an array of integers representing the branch indices that should process the record.
   *
   * Throwing an exception will return an error for the record.
   */
  type branching<T> = (options: Branching.options<T>) => number[];

  namespace ContentBasedFlowRouter {
    interface options {
      /** A JSON object containing the http headers received in the request from the trading partner. */
      httpHeaders: Record<string, string>;
      /** A JSON object containing the mime headers from the mime part containing EDI message. */
      mimeHeaders: Record<string, string>;
      /** A string containing unencrypted edi/xml content. */
      rawMessageBody: string;
    }

    interface response {
      /** The flow id that should be run. */
      _flowId: string;
      /** The export id that should be run. */
      _exportId: string;
    }
  }

  /**
   * The Content Based Flow Router is a way to route data to different exports/flows based on the content.
   *
   * The function needs to return an object specifying which flow & export to run.
   *
   * To signal a failure throw an exception.
   */
  type contentBasedFlowRouter = (options: ContentBasedFlowRouter.options) => ContentBasedFlowRouter.response;

  namespace FormInit {
    type options = standardOptions | integrationOptions;

    interface standardOptions {
      /** The resource being viewed in the UI. */
      resource: string;
      /** The parent of the resource being view in the UI. */
      parentResource: string;
      /** The grandparent of the resource being viewed in the UI. */
      grandparentResource: string;
      /** A flag indicating whether the script is invoked for sandbox. */
      sandbox: boolean;
    }

    interface integrationOptions extends standardOptions {
      /** The license provisioned to the integration. */
      license: string
      /** The parent of the licesnse provisioned to the integration. */
      parentLicense: string;
      /** The grandparent of the license provisioned to the integration. */
      grandparentLicense: string;
    }
  }

  /**
   *  The Form Init script is a way to design a custom form in code.
   *
   *  The function needs to return a form object for the UI to render.
   *
   *  Throwing an exception will signal an error.
   */
  type formInit = (options: FormInit.options) => Record<string, string>;

  namespace HandleRequest {

    type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

    interface options {
      /** The request method. */
      method: Method;
      /** The headers on the request. */
      headers: Record<string, string>
      /** The query string from the request. */
      queryString: Record<string, unknown>
      /** An object if the body is parseable, otherwise undefined. */
      body?: Record<string, unknown>
      /** The raw request body. */
      rawBody: string;
      /** A flag indicating whether the script is invoked for sandbox. */
      sandbox: boolean;
    }

    interface response {
      /** The status code of the response. */
      statusCode: number;
      /** The response header overrides. */
      headers?: Record<string, string>;
      /** The response body. */
      body: string | Record<string, unknown>;
    }
  }

  /**
   * The Handle Request script is a way to handle requests that come in.
   *
   * Throwing an exception will signal an error.
   */
  type handleRequest = (options: HandleRequest.options) => HandleRequest.response;
}

