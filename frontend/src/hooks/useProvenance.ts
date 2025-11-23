import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contentApi, RegisterContentRequest, VerifyContentRequest } from '../services/api';
import toast from 'react-hot-toast';

export const useProvenance = () => {
  const queryClient = useQueryClient();

  /**
   * Register content mutation
   */
  const registerContent = useMutation({
    mutationFn: (data: RegisterContentRequest) => contentApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Content registered successfully!');
    },
    onError: (error: unknown) => {
      console.error('Registration failed:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to register content';
      toast.error(errorMessage);
    },
  });

  /**
   * Verify content mutation
   */
  const verifyContent = useMutation({
    mutationFn: (data: VerifyContentRequest) => contentApi.verify(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
    onError: (error: unknown) => {
      console.error('Verification failed:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to verify content';
      toast.error(errorMessage);
    },
  });

  /**
   * Get content by ID
   */
  const useContent = (contentId?: string) => {
    return useQuery({
      queryKey: ['content', contentId],
      queryFn: () => contentApi.getById(contentId!),
      enabled: !!contentId,
    });
  };

  /**
   * Get content by hash
   */
  const useContentByHash = (contentHash?: string) => {
    return useQuery({
      queryKey: ['content', 'hash', contentHash],
      queryFn: () => contentApi.getByHash(contentHash!),
      enabled: !!contentHash,
    });
  };

  /**
   * Download certificate
   */
  const downloadCertificate = useMutation({
    mutationFn: async ({ contentId, filename }: { contentId: string; filename: string }) => {
      const blob = await contentApi.downloadCertificate(contentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Certificate downloaded successfully!');
    },
    onError: () => {
      toast.error('Failed to download certificate');
    },
  });

  return {
    registerContent,
    verifyContent,
    useContent,
    useContentByHash,
    downloadCertificate,
  };
};
