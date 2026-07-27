import { Download, FileText } from 'lucide-react';
import { useAttachmentSignedUrl } from '../messages.queries';
import type { MessageAttachment } from '../messages.types';

export function MessageAttachmentCard({
  attachment,
  bucket,
}: {
  attachment: MessageAttachment;
  bucket?: string;
}) {
  const signedUrlQuery = useAttachmentSignedUrl(attachment.storage_path, bucket);
  const isImage = attachment.mime_type.startsWith('image/');

  if (signedUrlQuery.isPending) {
    return <div className="mt-2 h-16 animate-pulse rounded-xl bg-white/[0.05]" />;
  }

  if (!signedUrlQuery.data) {
    return <p className="mt-2 text-xs text-red-300">Anexo indisponível.</p>;
  }

  if (isImage) {
    return (
      <a href={signedUrlQuery.data} rel="noreferrer" target="_blank">
        <img
          alt={attachment.original_name}
          className="mt-2 max-h-72 max-w-full rounded-2xl border border-white/10 object-contain"
          loading="lazy"
          src={signedUrlQuery.data}
        />
      </a>
    );
  }

  return (
    <a
      className="mt-2 flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-200 hover:bg-white/[0.07]"
      href={signedUrlQuery.data}
      rel="noreferrer"
      target="_blank"
    >
      <FileText aria-hidden="true" size={19} />
      <span className="min-w-0 flex-1 truncate">{attachment.original_name}</span>
      <Download aria-hidden="true" size={17} />
    </a>
  );
}
