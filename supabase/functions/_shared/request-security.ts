export const maximumEdgeFunctionBodyBytes = 32 * 1024;

export class RequestBodyError extends Error {
  public constructor(public readonly code: 'invalid_body' | 'payload_too_large') {
    super(code);
    this.name = 'RequestBodyError';
  }
}

export function parseAllowedOrigins(value: string | undefined) {
  return (
    value ??
    'http://127.0.0.1:5173,http://localhost,http://localhost:5173,crypt-app://app,https://crypt.local'
  )
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/u, ''))
    .filter(Boolean);
}

export function originIsAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.includes(origin.trim().replace(/\/$/u, ''));
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  );
}

export function isAllowedLivekitAction(value: unknown) {
  return (
    value === undefined || ['android_screen_share', 'join', 'participants'].includes(String(value))
  );
}

export function secretsMatch(received: null | string, expected: string) {
  if (!received || received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumEdgeFunctionBodyBytes) {
    throw new RequestBodyError('payload_too_large');
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maximumEdgeFunctionBodyBytes) {
    throw new RequestBodyError('payload_too_large');
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new RequestBodyError('invalid_body');
  }
}
