export function assertBlobUrl(input: string): URL {
  const url = new URL(input);
  return url;
}
