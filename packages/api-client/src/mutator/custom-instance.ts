import Axios, { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Same-origin gateway client. baseURL '/api' targets the Oathkeeper IdP seam;
 * withCredentials sends the Kratos session cookie the gateway exchanges for a JWT.
 * The browser never sees a Bearer token (ADR-0004 dual-mode enforcement).
 */
export const AXIOS_INSTANCE = Axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  (promise as Promise<T> & { cancel?: () => void }).cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
