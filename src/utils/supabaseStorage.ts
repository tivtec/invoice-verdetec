import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';
import { Order, Attachment } from '@/types/order';

// Order operations
export const createOrder = async (baseNumber: string): Promise<Order> => {
  const orderNumber = `Order ${baseNumber}`;
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      base_number: baseNumber,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
};

export const getOrderByBaseNumber = async (baseNumber: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('base_number', baseNumber)
    .single();

  if (error) return null;
  return data;
};

export const deleteOrder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Invoice operations
const formatInvoiceFromDb = (dbInvoice: any): Invoice => {
  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoice_number,
    documentType: dbInvoice.document_type,
    issueDate: dbInvoice.issue_date,
    placeOfIssue: dbInvoice.place_of_issue,
    currency: dbInvoice.currency,
    items: dbInvoice.invoice_items || [],
    createdAt: dbInvoice.created_at,
    updatedAt: dbInvoice.updated_at,
    companyType: dbInvoice.company_type,
    importerCompanyName: dbInvoice.importers?.company_name || '',
    importerTaxId: dbInvoice.importers?.tax_id || '',
    importerAddress: dbInvoice.importers?.address || '',
    importerZipCode: dbInvoice.importers?.zip_code || '',
    importerPhone: dbInvoice.importers?.phone || '',
    importerEmail: dbInvoice.importers?.email || '',
    importerCountry: dbInvoice.importers?.country || '',
    incoterm: dbInvoice.incoterm,
    modeOfTransport: dbInvoice.mode_of_transport,
    availability: dbInvoice.availability || '',
    paymentMethod: dbInvoice.payment_method,
    clientRepresentative: dbInvoice.client_representative,
    clientCompanyPosition: dbInvoice.client_company_position,
    clientPosition: dbInvoice.client_position,
    clientPositionTitle: dbInvoice.client_position_title,
    notes: dbInvoice.notes || '',
    showTotalWeight: dbInvoice.show_total_weight ?? true,
    packingWeight: dbInvoice.packing_weight || 0,
    includePackingWeight: dbInvoice.include_packing_weight ?? false,
  };
};

export const saveInvoice = async (invoice: Invoice, orderId: string): Promise<void> => {
  // First, save or update importer
  const importerData = {
    company_name: invoice.importerCompanyName,
    tax_id: invoice.importerTaxId,
    address: invoice.importerAddress,
    zip_code: invoice.importerZipCode,
    phone: invoice.importerPhone,
    email: invoice.importerEmail || null,
    country: invoice.importerCountry,
  };

  const { data: existingImporter } = await supabase
    .from('importers')
    .select('id')
    .eq('tax_id', invoice.importerTaxId)
    .single();

  let importerId: string;

  if (existingImporter) {
    const { data, error } = await supabase
      .from('importers')
      .update(importerData)
      .eq('id', existingImporter.id)
      .select()
      .single();
    
    if (error) throw error;
    importerId = data.id;
  } else {
    const { data, error } = await supabase
      .from('importers')
      .insert(importerData)
      .select()
      .single();
    
    if (error) throw error;
    importerId = data.id;
  }

  // Save or update invoice
  const invoiceData = {
    invoice_number: invoice.invoiceNumber,
    document_type: invoice.documentType,
    issue_date: invoice.issueDate,
    place_of_issue: invoice.placeOfIssue,
    currency: invoice.currency,
    company_type: invoice.companyType,
    importer_id: importerId,
    order_id: orderId,
    incoterm: invoice.incoterm,
    mode_of_transport: invoice.modeOfTransport,
    availability: invoice.availability || null,
    payment_method: invoice.paymentMethod,
    client_representative: invoice.clientRepresentative,
    client_company_position: invoice.clientCompanyPosition,
    client_position: invoice.clientPosition,
    client_position_title: invoice.clientPositionTitle,
    notes: invoice.notes || null,
    show_total_weight: invoice.showTotalWeight ?? true,
    packing_weight: invoice.packingWeight || null,
    include_packing_weight: invoice.includePackingWeight ?? false,
  };

  const { data: savedInvoice, error: invoiceError } = await supabase
    .from('invoices')
    .upsert({ ...invoiceData, id: invoice.id }, { onConflict: 'id' })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Delete existing items and re-insert
  await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', savedInvoice.id);

  if (invoice.items && invoice.items.length > 0) {
    const itemsData = invoice.items.map(item => ({
      invoice_id: savedInvoice.id,
      hs_code: item.hsCode,
      qty: item.qty,
      description: item.description,
      weight: item.weight,
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsData);

    if (itemsError) throw itemsError;
  }
};

export const getInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      importers (*),
      invoice_items (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map(formatInvoiceFromDb) || [];
};

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      importers (*),
      invoice_items (*)
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return formatInvoiceFromDb(data);
};

export const getInvoicesByOrderId = async (orderId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      importers (*),
      invoice_items (*)
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map(formatInvoiceFromDb) || [];
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const searchInvoices = async (query: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      importers (*),
      invoice_items (*)
    `)
    .or(`invoice_number.ilike.%${query}%,importers.company_name.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map(formatInvoiceFromDb) || [];
};

// Attachment operations
export const uploadAttachment = async (
  file: File,
  orderId: string,
  invoiceId?: string
): Promise<Attachment> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${orderId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('invoice-attachments')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      order_id: orderId,
      invoice_id: invoiceId || null,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAttachmentsByOrderId = async (orderId: string): Promise<Attachment[]> => {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAttachmentUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('invoice-attachments')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const deleteAttachment = async (id: string, filePath: string): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from('invoice-attachments')
    .remove([filePath]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;
};

// Invoice number generation
export const getBaseNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString().slice(-2);

  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('base_number', `${yearPrefix}%`);

  if (error) throw error;

  const sequentialNumber = ((count || 0) + 1).toString().padStart(4, '0');
  return `${yearPrefix}${sequentialNumber}`;
};

export const generateInvoiceNumber = async (): Promise<string> => {
  const baseNumber = await getBaseNumber();
  return `PI-${baseNumber}`;
};

export const generateCommercialInvoiceNumber = (proformaNumber: string): string => {
  const baseNumber = proformaNumber.match(/\d{6}$/)?.[0] || '';
  return `CI-${baseNumber}`;
};

export const generatePackingListNumber = (commercialNumber: string): string => {
  const baseNumber = commercialNumber.match(/\d{6}$/)?.[0] || '';
  return `PL-${baseNumber}`;
};
