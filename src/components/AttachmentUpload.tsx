import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { uploadAttachment } from '@/utils/supabaseStorage';
import { useToast } from '@/hooks/use-toast';

interface AttachmentUploadProps {
  orderId: string;
  invoiceId?: string;
  onUploadComplete: () => void;
}

export const AttachmentUpload = ({ orderId, invoiceId, onUploadComplete }: AttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF, PNG, or JPG files only.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      await uploadAttachment(file, orderId, invoiceId);
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });
      onUploadComplete();
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attachment">Upload Attachment (PDF, PNG, JPG - Max 10MB)</Label>
      <div className="flex gap-2">
        <Input
          id="attachment"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button type="button" disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
    </div>
  );
};
