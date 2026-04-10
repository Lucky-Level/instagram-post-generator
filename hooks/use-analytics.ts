export const useAnalytics = () => {
  const track = (
    _category: string,
    _object: string,
    _action: string,
    _metadata?: Record<string, unknown>
  ) => {
    // no-op: analytics disabled
  };

  return { track };
};
