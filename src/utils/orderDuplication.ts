const SIX_DIGIT_SUFFIX = /\d{6}$/;

export const buildDuplicatedInvoiceNumber = (
  invoiceNumber: string,
  newBaseNumber: string,
): string => {
  if (SIX_DIGIT_SUFFIX.test(invoiceNumber)) {
    return invoiceNumber.replace(SIX_DIGIT_SUFFIX, newBaseNumber);
  }

  return `${invoiceNumber}-${newBaseNumber}`;
};

export const getDuplicatedAttachmentPath = (
  orderId: string,
  originalFileName: string,
  uniqueId: string,
): string => {
  const extensionIndex = originalFileName.lastIndexOf('.');
  const extension = extensionIndex >= 0 ? originalFileName.slice(extensionIndex) : '';
  return `${orderId}/${uniqueId}${extension}`;
};
