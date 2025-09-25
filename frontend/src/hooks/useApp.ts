// This hook has been replaced with useToast from Shadcn UI
// Keeping for backward compatibility during migration
export const useApp = () => {
  return {
    message: {
      success: (msg: string) => console.log('Success:', msg),
      error: (msg: string) => console.error('Error:', msg),
      info: (msg: string) => console.info('Info:', msg),
      warning: (msg: string) => console.warn('Warning:', msg),
    }
  };
};

export default useApp;
