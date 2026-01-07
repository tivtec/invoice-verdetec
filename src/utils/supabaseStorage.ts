import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';
import { Order, Attachment } from '@/types/order';

// Order operations
const insertOrder = async (baseNumber: string, attempt = 1): Promise<Order> => {
  const orderNumber = `Order ${baseNumber}`;
  const timestamp = new Date().toISOString();

  if (!baseNumber) {
    throw new Error('Base number is empty; cannot create order.');
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      base_number: baseNumber,
      order_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select()
    .single();

  // If duplicate, try next sequential (protect against race conditions)
  const isDuplicate = (error as any)?.code === '23505';
  if (isDuplicate && attempt < 3) {
    const nextBase = await getBaseNumber();
    return insertOrder(nextBase, attempt + 1);
  }

  if (error) {
    const message = (error as any)?.message || (error as any)?.details || JSON.stringify(error);
    throw new Error(message);
  }
  if (!data) {
    throw new Error('No data returned from Supabase when creating order.');
  }
  return data as Order;
};

export const createOrder = async (baseNumber: string): Promise<Order> => {
  return insertOrder(baseNumber);
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
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
};

export const getOrderByBaseNumber = async (baseNumber: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('base_number', baseNumber)
    .limit(1)
    .maybeSingle();

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

export const updateOrderNote = async (id: string, note: string | null) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      order_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Order | null;
};

// Invoice operations
const formatInvoiceFromDb = (dbInvoice: any): Invoice => {
  // Map invoice items from snake_case to camelCase
  const items = (dbInvoice.invoice_items || []).map((item: any) => ({
    id: item.id,
    hsCode: item.hs_code || '',
    qty: item.qty || 0,
    description: item.description || '',
    weight: item.weight || 0,
    unitPrice: item.unit_price || 0,
    total: item.total || 0,
    packingWeight: item.volume || 0,
  }));

  const itemPackingWeight = items.reduce((sum: number, item: any) => sum + (item.packingWeight || 0) * (item.qty || 0), 0);

  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoice_number,
    documentType: dbInvoice.document_type,
    orderId: dbInvoice.order_id || undefined,
    issueDate: dbInvoice.issue_date,
    placeOfIssue: dbInvoice.place_of_issue,
    currency: dbInvoice.currency,
    items,
    createdAt: dbInvoice.created_at,
    updatedAt: dbInvoice.updated_at,
    companyType: dbInvoice.company_type,
    exporterAddressKey: dbInvoice.exporter_address_key || undefined,
    portOfLoading: dbInvoice.port_of_loading || (dbInvoice as any).Port_of_loading || '',
    portOfDischarge: dbInvoice.port_of_discharge || (dbInvoice as any).Port_of_discharge || '',
    placeOfDelivery: dbInvoice.place_of_delivery || (dbInvoice as any).Place_of_delivery || '',
    placeOfDestination: dbInvoice.place_of_destination || (dbInvoice as any).Place_of_destination || '',
    freightCost: dbInvoice.freight_cost ?? (dbInvoice as any).Freight_cost ?? 0,
    insuranceCost: dbInvoice.insurance_cost ?? (dbInvoice as any).Insurance_cost ?? 0,
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
    packingWeight: dbInvoice.packing_weight || itemPackingWeight || 0,
    includePackingWeight: dbInvoice.include_packing_weight ?? false,
    totalPackingWeight: dbInvoice.packing_weight || itemPackingWeight || 0,
    applyDiscount: dbInvoice.apply_discount ?? (dbInvoice as any).Apply_discount ?? false,
    discountAmount: dbInvoice.discount_amount ?? (dbInvoice as any).Discount_amount ?? 0,
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
    .limit(1)
    .maybeSingle();

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
    exporter_address_key: invoice.exporterAddressKey || null,
    importer_id: importerId,
    order_id: orderId,
    incoterm: invoice.incoterm,
    mode_of_transport: invoice.modeOfTransport,
    availability: invoice.availability || null,
    port_of_loading: invoice.portOfLoading || null,
    port_of_discharge: invoice.portOfDischarge || null,
    place_of_delivery: invoice.placeOfDelivery || null,
    place_of_destination: invoice.placeOfDestination || null,
    freight_cost: invoice.freightCost ?? null,
    insurance_cost: invoice.insuranceCost ?? null,
    payment_method: invoice.paymentMethod,
    client_representative: invoice.clientRepresentative,
    client_company_position: invoice.clientCompanyPosition,
    client_position: invoice.clientPosition,
    client_position_title: invoice.clientPositionTitle,
    notes: invoice.notes || null,
    show_total_weight: invoice.showTotalWeight ?? true,
    packing_weight: invoice.packingWeight || null,
    include_packing_weight: invoice.includePackingWeight ?? false,
    apply_discount: invoice.applyDiscount ?? false,
    discount_amount: invoice.applyDiscount ? invoice.discountAmount ?? 0 : 0,
  };

  // Reuse existing invoice id when the invoice number already exists to avoid FK conflicts
  const { data: existingInvoiceByNumber } = await supabase
    .from('invoices')
    .select('id')
    .eq('invoice_number', invoice.invoiceNumber)
    .limit(1)
    .maybeSingle();
  const invoiceId = existingInvoiceByNumber?.id || invoice.id;

  const tryUpsert = async (payload: any) =>
    supabase
      .from('invoices')
      .upsert({ ...payload, id: invoiceId }, { onConflict: 'invoice_number' })
      .select()
      .single();

  let savedInvoice;
  let invoiceError;

  ({ data: savedInvoice, error: invoiceError } = await tryUpsert(invoiceData));

  const missingPlaceCols =
    (invoiceError as any)?.message?.toLowerCase().includes('place_of_delivery') ||
    (invoiceError as any)?.message?.toLowerCase().includes('place_of_destination') ||
    (invoiceError as any)?.message?.toLowerCase().includes('port_of_loading') ||
    (invoiceError as any)?.message?.toLowerCase().includes('port_of_discharge') ||
    (invoiceError as any)?.details?.toLowerCase().includes('place_of_delivery') ||
    (invoiceError as any)?.details?.toLowerCase().includes('place_of_destination') ||
    (invoiceError as any)?.details?.toLowerCase().includes('port_of_loading') ||
    (invoiceError as any)?.details?.toLowerCase().includes('port_of_discharge');

  if (invoiceError && missingPlaceCols) {
    const uppercasePayload: any = { ...invoiceData };
    uppercasePayload.Port_of_loading = uppercasePayload.port_of_loading;
    uppercasePayload.Port_of_discharge = uppercasePayload.port_of_discharge;
    uppercasePayload.Place_of_delivery = uppercasePayload.place_of_delivery;
    uppercasePayload.Place_of_destination = uppercasePayload.place_of_destination;
    delete uppercasePayload.port_of_loading;
    delete uppercasePayload.port_of_discharge;
    delete uppercasePayload.place_of_delivery;
    delete uppercasePayload.place_of_destination;
    uppercasePayload.Apply_discount = uppercasePayload.apply_discount;
    uppercasePayload.Discount_amount = uppercasePayload.discount_amount;
    delete uppercasePayload.apply_discount;
    delete uppercasePayload.discount_amount;
    ({ data: savedInvoice, error: invoiceError } = await tryUpsert(uppercasePayload));
  }

  const missingDiscountCols =
    (invoiceError as any)?.message?.toLowerCase().includes('discount') ||
    (invoiceError as any)?.details?.toLowerCase().includes('discount');

  if (invoiceError && missingDiscountCols) {
    const fallbackPayload = { ...invoiceData };
    delete (fallbackPayload as any).apply_discount;
    delete (fallbackPayload as any).discount_amount;
    ({ data: savedInvoice, error: invoiceError } = await tryUpsert(fallbackPayload));
  }

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
      volume: item.packingWeight || 0,
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

// Importers
export const getImporters = async () => {
  // Prefer new `clients` table; fall back to `importers` for compatibility and handle missing archived column.
  type ClientRow = {
    id: string;
    company_name: string;
    tax_identification_number: string | null;
    address_city_state: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
    country_of_destination: string | null;
    archived: boolean | null;
  };

  const mapClient = (row: ClientRow) => ({
    id: row.id,
    company_name: row.company_name,
    tax_id: row.tax_identification_number || '',
    address: row.address_city_state || '',
    zip_code: row.zip_code || '',
    phone: row.phone || '',
    email: row.email || '',
    country: row.country_of_destination || '',
    archived: !!row.archived,
  });

  const tryTable = async (table: 'clients' | 'importers') => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .or('archived.is.null,archived.eq.false')
      .order('company_name', { ascending: true });

    const missingArchived =
      (error as any)?.message?.toString().toLowerCase().includes('archived') ||
      (error as any)?.details?.toString().toLowerCase().includes('archived');

    if (missingArchived) {
      const fallback = await supabase
        .from(table)
        .select('*')
        .order('company_name', { ascending: true });

      if (fallback.error) throw fallback.error;
      const rows = fallback.data || [];
      return table === 'clients'
        ? (rows as ClientRow[]).map(mapClient)
        : rows.map((imp: any) => ({ ...imp, archived: false }));
    }

    if (error) throw error;
    const rows = data || [];
    return table === 'clients'
      ? (rows as ClientRow[]).map(mapClient)
      : rows;
  };

  try {
    return await tryTable('clients');
  } catch (err: any) {
    const relationMissing = err?.message?.toLowerCase().includes('clients') && err?.message?.toLowerCase().includes('does not exist');
    if (!relationMissing) throw err;
  }

  return tryTable('importers');
};

export const createImporter = async (payload: {
  company_name: string;
  tax_id: string;
  address: string;
  zip_code: string;
  phone: string;
  email?: string | null;
  country: string;
}) => {
  const attempt = async (table: 'clients' | 'importers') => {
    const basePayload =
      table === 'clients'
        ? {
            company_name: payload.company_name,
            tax_identification_number: payload.tax_id,
            address_city_state: payload.address,
            zip_code: payload.zip_code,
            phone: payload.phone,
            email: payload.email || null,
            country_of_destination: payload.country,
          }
        : {
            ...payload,
            email: payload.email || null,
            archived: false,
          };

    const { data, error } = await supabase
      .from(table)
      .insert(basePayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  try {
    return await attempt('clients');
  } catch (err: any) {
    const missing = err?.message?.toLowerCase().includes('clients') && err?.message?.toLowerCase().includes('does not exist');
    if (!missing) throw err;
  }

  return attempt('importers');
};

export const updateImporter = async (
  id: string,
  payload: {
    company_name: string;
    tax_id: string;
    address: string;
    zip_code: string;
    phone: string;
    email?: string | null;
  country: string;
  }
) => {
  const attempt = async (table: 'clients' | 'importers') => {
    const basePayload =
      table === 'clients'
        ? {
            company_name: payload.company_name,
            tax_identification_number: payload.tax_id,
            address_city_state: payload.address,
            zip_code: payload.zip_code,
            phone: payload.phone,
            email: payload.email || null,
            country_of_destination: payload.country,
          }
        : {
            ...payload,
            email: payload.email || null,
            updated_at: new Date().toISOString(),
          };

    const { data, error } = await supabase
      .from(table)
      .update(basePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  try {
    return await attempt('clients');
  } catch (err: any) {
    const missing = err?.message?.toLowerCase().includes('clients') && err?.message?.toLowerCase().includes('does not exist');
    if (!missing) throw err;
  }

  return attempt('importers');
};

export const deleteImporter = async (id: string) => {
  const attempt = async (table: 'clients' | 'importers') => {
    const { error } = await supabase
      .from(table)
      .update({ archived: true })
      .eq('id', id);

    const missingArchived =
      (error as any)?.message?.toString().toLowerCase().includes('archived') ||
      (error as any)?.details?.toString().toLowerCase().includes('archived');

    if (missingArchived) {
      throw new Error('A coluna "archived" não existe. Rode a migração SQL para adicioná-la e permitir exclusão segura.');
    }

    if (error) {
      const message = (error as any)?.message || (error as any)?.details || 'Erro ao excluir cliente.';
      throw new Error(message);
    }
  };

  try {
    await attempt('clients');
  } catch (err: any) {
    const missing = err?.message?.toLowerCase().includes('clients') && err?.message?.toLowerCase().includes('does not exist');
    if (!missing) throw err;
    await attempt('importers');
  }
};

// Products (CRUD)
export type ProductRecord = {
  id: string;
  hs_code: string;
  description: string;
  weight_kg: number | null;
  archived?: boolean | null;
};

const productsTable = 'products';

const ensureProductsTableExists = (error: any) => {
  const missing =
    error?.message?.toLowerCase().includes(productsTable) &&
    error?.message?.toLowerCase().includes('does not exist');
  if (missing) {
    throw new Error(
      `Tabela "${productsTable}" não encontrada no Supabase. Crie-a com colunas: id (uuid, pk, default uuid_generate_v4()), hs_code text, description text, weight_kg numeric, archived boolean default false.`
    );
  }
};

export const getProducts = async (): Promise<ProductRecord[]> => {
  const { data, error } = await supabase
    .from(productsTable)
    .select('*')
    .eq('archived', false)
    .order('description', { ascending: true });

  const missingArchived =
    (error as any)?.message?.toLowerCase().includes('archived') ||
    (error as any)?.details?.toLowerCase().includes('archived');

  if (missingArchived) {
    const fallback = await supabase
      .from(productsTable)
      .select('*')
      .order('description', { ascending: true });
    if (fallback.error) {
      ensureProductsTableExists(fallback.error);
      throw fallback.error;
    }
    return (fallback.data || []) as ProductRecord[];
  }

  if (error) {
    ensureProductsTableExists(error);
    throw error;
  }
  return (data || []) as ProductRecord[];
};

export const createProduct = async (payload: {
  hs_code: string;
  description: string;
  weight_kg?: number | null;
}) => {
  const { data, error } = await supabase
    .from(productsTable)
    .insert({
      hs_code: payload.hs_code,
      description: payload.description,
      weight_kg: payload.weight_kg ?? null,
      archived: false,
    })
    .select()
    .single();

  const missingArchived =
    (error as any)?.message?.toLowerCase().includes('archived') ||
    (error as any)?.details?.toLowerCase().includes('archived');

  if (missingArchived) {
    const fallback = await supabase
      .from(productsTable)
      .insert({
        hs_code: payload.hs_code,
        description: payload.description,
        weight_kg: payload.weight_kg ?? null,
      })
      .select()
      .single();
    if (fallback.error) {
      ensureProductsTableExists(fallback.error);
      throw fallback.error;
    }
    return fallback.data as ProductRecord;
  }

  if (error) {
    ensureProductsTableExists(error);
    throw error;
  }
  return data as ProductRecord;
};

export const updateProduct = async (
  id: string,
  payload: {
    hs_code: string;
    description: string;
    weight_kg?: number | null;
  }
) => {
  const { data, error } = await supabase
    .from(productsTable)
    .update({
      hs_code: payload.hs_code,
      description: payload.description,
      weight_kg: payload.weight_kg ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  const missingArchived =
    (error as any)?.message?.toLowerCase().includes('archived') ||
    (error as any)?.details?.toLowerCase().includes('archived');

  if (missingArchived) {
    const fallback = await supabase
      .from(productsTable)
      .update({
        hs_code: payload.hs_code,
        description: payload.description,
        weight_kg: payload.weight_kg ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (fallback.error) {
      ensureProductsTableExists(fallback.error);
      throw fallback.error;
    }
    return fallback.data as ProductRecord;
  }

  if (error) {
    ensureProductsTableExists(error);
    throw error;
  }
  return data as ProductRecord;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from(productsTable)
    .update({ archived: true })
    .eq('id', id);

  const missingArchived =
    (error as any)?.message?.toLowerCase().includes('archived') ||
    (error as any)?.details?.toLowerCase().includes('archived');

  if (missingArchived) {
    // If no archived column, hard delete
    const hardDelete = await supabase.from(productsTable).delete().eq('id', id);
    if (hardDelete.error) {
      ensureProductsTableExists(hardDelete.error);
      const message = (hardDelete.error as any)?.message || (hardDelete.error as any)?.details || 'Erro ao excluir produto.';
      throw new Error(message);
    }
    return;
  }

  if (error) {
    ensureProductsTableExists(error);
    const message = (error as any)?.message || (error as any)?.details || 'Erro ao excluir produto.';
    throw new Error(message);
  }
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

// Deprecated in favor of client-side filtering (left for compatibility)
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

  // Get the highest base_number for the year and increment
  const { data, error } = await supabase
    .from('orders')
    .select('base_number')
    .like('base_number', `${yearPrefix}%`)
    .order('base_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  const lastBase = data && data.length > 0 ? parseInt(data[0].base_number, 10) : undefined;
  const next = (lastBase || parseInt(`${yearPrefix}0000`, 10)) + 1;
  return next.toString().padStart(6, '0');
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
