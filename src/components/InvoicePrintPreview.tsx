import { MutableRefObject, Ref, useLayoutEffect, useRef, useState } from 'react';
import { Invoice, InvoiceItem, getCompanyData } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import verdetecLogo from '@/assets/verdetec-logo.png';
import { formatInvoiceAmount } from '@/utils/numberFormat';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

type TailBlockKey = 'summary' | 'notes' | 'signature';

type TailBlock = {
  key: TailBlockKey;
  height: number;
};

type PreviewPage = {
  items: InvoiceItem[];
  tailBlocks: TailBlockKey[];
};

const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 15;
const DEFAULT_ROW_HEIGHT_PX = 28;

const mmToPx = (mm: number) => (mm * 96) / 25.4;

const normalizeNumber = (value: unknown) => {
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2);
};

const computeItemTotalWeight = (invoice: Invoice, item: InvoiceItem) => {
  const qty = normalizeNumber(item.qty);
  const weight = normalizeNumber(item.weight);

  if (invoice.companyType === 'insumos') {
    return qty || weight;
  }

  return weight * qty;
};

const getDisplayedQuantity = (invoice: Invoice, item: InvoiceItem) => {
  if (invoice.documentType === 'packing') {
    return formatQuantity(normalizeNumber(item.qty || item.weight));
  }

  if (invoice.companyType === 'insumos') {
    const quantity =
      invoice.documentType === 'commercial'
        ? normalizeNumber(item.weight)
        : normalizeNumber(item.qty || item.weight);

    return quantity.toFixed(2);
  }

  return formatQuantity(normalizeNumber(item.qty));
};

const paginateForward = (
  items: InvoiceItem[],
  rowHeights: number[],
  capacity: number
) => {
  if (items.length === 0) {
    return [];
  }

  const pages: InvoiceItem[][] = [];
  let start = 0;

  while (start < items.length) {
    let used = 0;
    let end = start;

    while (end < items.length) {
      const rowHeight = rowHeights[end] || DEFAULT_ROW_HEIGHT_PX;
      const wouldOverflow = used + rowHeight > capacity;

      if (wouldOverflow && end > start) {
        break;
      }

      used += rowHeight;
      end += 1;

      if (wouldOverflow) {
        break;
      }
    }

    pages.push(items.slice(start, end));
    start = end;
  }

  return pages;
};

const takeRowsThatFitOnLastPage = (
  items: InvoiceItem[],
  rowHeights: number[],
  capacity: number
) => {
  if (capacity <= 0 || items.length === 0) {
    return { leadingItems: items, lastPageItems: [] as InvoiceItem[] };
  }

  let used = 0;
  let splitIndex = items.length;

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const rowHeight = rowHeights[index] || DEFAULT_ROW_HEIGHT_PX;
    const wouldOverflow = used + rowHeight > capacity;

    if (wouldOverflow && splitIndex < items.length) {
      break;
    }

    if (wouldOverflow) {
      return { leadingItems: items, lastPageItems: [] as InvoiceItem[] };
    }

    used += rowHeight;
    splitIndex = index;
  }

  return {
    leadingItems: items.slice(0, splitIndex),
    lastPageItems: items.slice(splitIndex),
  };
};

const paginateTailBlocks = (blocks: TailBlock[], capacity: number) => {
  if (blocks.length === 0) {
    return [];
  }

  const pages: TailBlockKey[][] = [];
  let currentPage: TailBlockKey[] = [];
  let used = 0;

  blocks.forEach((block) => {
    const wouldOverflow = used + block.height > capacity;

    if (wouldOverflow && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block.key];
      used = block.height;
      return;
    }

    currentPage.push(block.key);
    used += block.height;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

const buildPreviewPages = ({
  items,
  rowHeights,
  itemPageCapacity,
  itemPageCapacityWithTail,
  tailOnlyPageCapacity,
  tailBlocks,
}: {
  items: InvoiceItem[];
  rowHeights: number[];
  itemPageCapacity: number;
  itemPageCapacityWithTail: number;
  tailOnlyPageCapacity: number;
  tailBlocks: TailBlock[];
}): PreviewPage[] => {
  const safeItemCapacity = Math.max(itemPageCapacity, DEFAULT_ROW_HEIGHT_PX);
  const safeTailOnlyCapacity = Math.max(tailOnlyPageCapacity, DEFAULT_ROW_HEIGHT_PX * 2);
  const totalTailHeight = tailBlocks.reduce((sum, block) => sum + block.height, 0);
  const tailKeys = tailBlocks.map((block) => block.key);

  if (items.length === 0) {
    const tailPages = paginateTailBlocks(tailBlocks, safeTailOnlyCapacity);
    if (tailPages.length === 0) {
      return [{ items: [], tailBlocks: [] }];
    }

    return tailPages.map((pageTailBlocks) => ({
      items: [],
      tailBlocks: pageTailBlocks,
    }));
  }

  const totalItemHeight = rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);

  if (totalItemHeight + totalTailHeight <= itemPageCapacityWithTail) {
    return [
      {
        items,
        tailBlocks: tailKeys,
      },
    ];
  }

  if (totalTailHeight < safeItemCapacity && itemPageCapacityWithTail > 0) {
    const { leadingItems, lastPageItems } = takeRowsThatFitOnLastPage(
      items,
      rowHeights,
      itemPageCapacityWithTail
    );

    if (lastPageItems.length > 0) {
      const leadingRowHeights = rowHeights.slice(0, leadingItems.length);
      const leadingPages = paginateForward(leadingItems, leadingRowHeights, safeItemCapacity).map(
        (pageItems) => ({
          items: pageItems,
          tailBlocks: [] as TailBlockKey[],
        })
      );

      return [
        ...leadingPages,
        {
          items: lastPageItems,
          tailBlocks: tailKeys,
        },
      ];
    }
  }

  const itemPages = paginateForward(items, rowHeights, safeItemCapacity).map((pageItems) => ({
    items: pageItems,
    tailBlocks: [] as TailBlockKey[],
  }));

  const tailPages = paginateTailBlocks(tailBlocks, safeTailOnlyCapacity).map((pageTailBlocks) => ({
    items: [] as InvoiceItem[],
    tailBlocks: pageTailBlocks,
  }));

  return tailPages.length > 0 ? [...itemPages, ...tailPages] : itemPages;
};

type PreviewHeaderProps = {
  invoice: Invoice;
  documentTitle: string;
  company: ReturnType<typeof getCompanyData>;
  showPortLoading: boolean;
  showPortDischarge: boolean;
  showPlaceOfDelivery: boolean;
  showPlaceOfDestination: boolean;
};

const PreviewHeader = ({
  invoice,
  documentTitle,
  company,
  showPortLoading,
  showPortDischarge,
  showPlaceOfDelivery,
  showPlaceOfDestination,
}: PreviewHeaderProps) => (
  <>
    <div className="flex justify-between items-start mb-4">
      <img
        src={verdetecLogo}
        alt="Verdetec Logo"
        className="h-10"
        style={{
          filter:
            invoice.companyType === 'insumos'
              ? 'brightness(0) saturate(100%) invert(16%) sepia(28%) saturate(1745%) hue-rotate(137deg) brightness(92%) contrast(95%)'
              : 'brightness(0) saturate(100%) invert(43%) sepia(89%) saturate(1721%) hue-rotate(4deg) brightness(99%) contrast(91%)',
        }}
      />
      <div className="text-center flex-1">
        <h1 className="text-2xl font-bold">{documentTitle}</h1>
      </div>
      <div className="w-10" />
    </div>

    <div className="grid grid-cols-2 gap-6 mb-4">
      <div>
        <h3 className="font-semibold mb-1 text-sm">Supplier / Exporter:</h3>
        <p className="font-bold text-sm">{company.name}</p>
        <p className="text-xs">CNPJ: {company.cnpj}</p>
        <p className="text-xs break-words">{company.address}</p>
        <p className="text-xs">ZIP Code: {company.zipCode}</p>
        <p className="text-xs">Phone: {company.phone}</p>
        <p className="text-xs">Country of Origin: Brazil</p>
      </div>

      <div className="text-right">
        <p className="text-xs">
          <span className="font-semibold">Invoice No.:</span> {invoice.invoiceNumber}
        </p>
        <p className="text-xs">
          <span className="font-semibold">Issue Date:</span> {invoice.issueDate}
        </p>
        <p className="text-xs">
          <span className="font-semibold">Place of Issue:</span> {invoice.placeOfIssue}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6 mb-4">
      <div>
        <h3 className="font-semibold mb-1 text-sm">Importer / Buyer:</h3>
        <p className="font-bold text-sm">{invoice.importerCompanyName}</p>
        <p className="text-xs">{invoice.importerTaxId}</p>
        <p className="text-xs break-words">{invoice.importerAddress}</p>
        <p className="text-xs">Zip Code: {invoice.importerZipCode}</p>
        <p className="text-xs">Phone: {invoice.importerPhone}</p>
        {invoice.importerEmail && <p className="text-xs">E-mail: {invoice.importerEmail}</p>}
        <p className="text-xs">Country of Destination: {invoice.importerCountry}</p>
      </div>

      <div className="text-right">
        <p className="text-xs">
          <span className="font-semibold">INCOTERM:</span> {invoice.incoterm}
        </p>
        <p className="text-xs">
          <span className="font-semibold">Currency:</span> {invoice.currency || 'USD'}
        </p>
        <p className="text-xs">
          <span className="font-semibold">Mode of Transport:</span> {invoice.modeOfTransport}
        </p>
        {invoice.availability && invoice.documentType === 'proforma' && (
          <p className="text-xs">
            <span className="font-semibold">Availability:</span> {invoice.availability}
          </p>
        )}
        {showPortLoading && invoice.portOfLoading && (
          <p className="text-xs">
            <span className="font-semibold">Port of Loading:</span> {invoice.portOfLoading}
          </p>
        )}
        {showPortDischarge && invoice.portOfDischarge && (
          <p className="text-xs">
            <span className="font-semibold">Port of Discharge:</span> {invoice.portOfDischarge}
          </p>
        )}
        {showPlaceOfDestination && invoice.placeOfDestination && (
          <p className="text-xs">
            <span className="font-semibold">Named Place of Destination:</span> {invoice.placeOfDestination}
          </p>
        )}
        {showPlaceOfDelivery && invoice.placeOfDelivery && (
          <p className="text-xs">
            <span className="font-semibold">Final Delivery Location:</span> {invoice.placeOfDelivery}
          </p>
        )}
        <p className="text-xs">
          <span className="font-semibold">
            {invoice.documentType === 'commercial' ? 'Terms of Payment:' : 'Payment Method:'}
          </span>{' '}
          {invoice.paymentMethod}
        </p>
        {invoice.documentType === 'packing' && invoice.sourceInvoiceId && (
          <p className="text-xs">
            <span className="font-semibold">Packing List related to Commercial Invoice Nº:</span>{' '}
            {invoice.sourceInvoiceId}
          </p>
        )}
      </div>
    </div>
  </>
);

type ItemRowsProps = {
  invoice: Invoice;
  items: InvoiceItem[];
  currencyLabel: string;
  rowRefs?: MutableRefObject<Record<string, HTMLTableRowElement | null>>;
};

const ItemRows = ({ invoice, items, currencyLabel, rowRefs }: ItemRowsProps) => {
  const isPackingList = invoice.documentType === 'packing';

  return (
    <>
      {items.map((item) => (
        <tr
          key={item.id}
          className="border-b align-top"
          ref={(element) => {
            if (rowRefs) {
              rowRefs.current[item.id] = element;
            }
          }}
        >
          {!isPackingList && <td className="py-2 px-2 text-sm">{item.hsCode}</td>}
          <td className="text-center py-2 px-2 text-sm">{getDisplayedQuantity(invoice, item)}</td>
          <td className="py-2 px-2 text-sm break-words">{item.description}</td>
          {invoice.companyType !== 'insumos' && (
            <td className="text-right py-2 px-2 text-sm">
              {normalizeNumber(item.weight).toFixed(2)}
            </td>
          )}
          {!isPackingList && (
            <td className="text-right py-2 px-2 text-sm">
              {currencyLabel} {formatInvoiceAmount(item.unitPrice, currencyLabel)}
            </td>
          )}
          {!isPackingList && (
            <td className="text-right py-2 px-2 text-sm">
              {currencyLabel} {formatInvoiceAmount(item.total, currencyLabel)}
            </td>
          )}
          {isPackingList && (
            <td className="text-right py-2 px-2 text-sm">
              {computeItemTotalWeight(invoice, item).toFixed(2)}
            </td>
          )}
        </tr>
      ))}
    </>
  );
};

type ItemsTableProps = {
  invoice: Invoice;
  items: InvoiceItem[];
  currencyLabel: string;
  rowRefs?: MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  tableHeaderRef?: Ref<HTMLTableSectionElement>;
};

const ItemsTable = ({
  invoice,
  items,
  currencyLabel,
  rowRefs,
  tableHeaderRef,
}: ItemsTableProps) => {
  const isPackingList = invoice.documentType === 'packing';

  return (
    <table className="w-full border-collapse mb-4">
      <thead ref={tableHeaderRef}>
        <tr className="border-b-2 border-foreground">
          {!isPackingList && <th className="text-left py-2 px-2 text-sm">HS CODE (NCM)</th>}
          <th className="text-center py-2 px-2 text-sm">
            {invoice.companyType === 'insumos' ? 'QTY (kg)' : 'QTY'}
          </th>
          <th className="text-left py-2 px-2 text-sm">DESCRIPTION</th>
          {invoice.companyType !== 'insumos' && (
            <th className="text-right py-2 px-2 text-sm">
              {isPackingList ? 'Weight per Unit (kg)' : 'Unit Weight (kg)'}
            </th>
          )}
          {!isPackingList && (
            <th className="text-right py-2 px-2 text-sm">
              {invoice.companyType === 'insumos' ? 'UNIT PRICE (per kg)' : 'UNIT PRICE'}
            </th>
          )}
          {!isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL</th>}
          {isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL WEIGHT</th>}
        </tr>
      </thead>
      <tbody>
        <ItemRows invoice={invoice} items={items} currencyLabel={currencyLabel} rowRefs={rowRefs} />
      </tbody>
    </table>
  );
};

type SummaryBlockProps = {
  invoice: Invoice;
  company: ReturnType<typeof getCompanyData>;
  currencyLabel: string;
  subtotal: number;
  freightCost: number;
  insuranceCost: number;
  discountValue: number;
  totalAmount: number;
  totalWeight: number;
  totalPackingWeight: number;
  showTotalWeight: boolean;
  showFreightLine: boolean;
  showInsuranceLine: boolean;
};

const SummaryBlock = ({
  invoice,
  company,
  currencyLabel,
  subtotal,
  freightCost,
  insuranceCost,
  discountValue,
  totalAmount,
  totalWeight,
  totalPackingWeight,
  showTotalWeight,
  showFreightLine,
  showInsuranceLine,
}: SummaryBlockProps) => {
  const isPackingList = invoice.documentType === 'packing';

  if (isPackingList) {
    return (
      <div className="avoid-break mt-2 border-t-2 border-foreground pt-4">
        <div className="ml-auto w-full max-w-[85mm] space-y-1 text-sm">
          {invoice.includePackingWeight && totalPackingWeight > 0 && (
            <div className="flex items-center justify-between">
              <span>Total Packing Weight</span>
              <span>{totalPackingWeight.toFixed(2)} KG</span>
            </div>
          )}
          {showTotalWeight && (
            <div className="flex items-center justify-between font-semibold">
              <span>Total Shipment Weight</span>
              <span>{totalWeight.toFixed(2)} KG</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalsPanel = (
    <div className="w-full max-w-[85mm] ml-auto space-y-1 text-sm">
      {invoice.includePackingWeight && totalPackingWeight > 0 && (
        <div className="flex items-center justify-between">
          <span>Packing Weight</span>
          <span>{totalPackingWeight.toFixed(2)} KG</span>
        </div>
      )}
      {showTotalWeight && (
        <div className="flex items-center justify-between">
          <span>Total Weight</span>
          <span>{totalWeight.toFixed(2)} KG</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span>Subtotal</span>
        <span>
          {currencyLabel} {formatInvoiceAmount(subtotal, currencyLabel)}
        </span>
      </div>
      {showFreightLine && (
        <div className="flex items-center justify-between">
          <span>Freight</span>
          <span>
            {currencyLabel} {formatInvoiceAmount(freightCost, currencyLabel)}
          </span>
        </div>
      )}
      {showInsuranceLine && (
        <div className="flex items-center justify-between">
          <span>Insurance</span>
          <span>
            {currencyLabel} {formatInvoiceAmount(insuranceCost, currencyLabel)}
          </span>
        </div>
      )}
      {discountValue > 0 && (
        <div className="flex items-center justify-between text-destructive">
          <span>Discount</span>
          <span>
            - {currencyLabel} {formatInvoiceAmount(discountValue, currencyLabel)}
          </span>
        </div>
      )}
      <div className="border-t border-foreground pt-2 flex items-center justify-between font-bold text-lg">
        <span>Total Amount</span>
        <span>
          {currencyLabel} {formatInvoiceAmount(totalAmount, currencyLabel)}
        </span>
      </div>
    </div>
  );

  if (invoice.documentType === 'commercial') {
    return (
      <div className="avoid-break mt-2 border-t-2 border-foreground pt-4">{totalsPanel}</div>
    );
  }

  return (
    <div className="avoid-break mt-2 border-t-2 border-foreground pt-4 grid grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold mb-1 text-sm">Bank Details:</h3>
        <p className="text-xs">Bank: {company.bankDetails.bank}</p>
        <p className="text-xs">SWIFT: {company.bankDetails.swift}</p>
        <p className="text-xs">IBAN: {company.bankDetails.iban}</p>
      </div>
      {totalsPanel}
    </div>
  );
};

const NotesBlock = ({ notes }: { notes: string }) => (
  <div className="avoid-break border-t pt-4">
    <h3 className="font-semibold mb-1 text-sm">Note:</h3>
    <p className="text-xs whitespace-pre-wrap break-words leading-5">{notes}</p>
  </div>
);

type SignatureBlockProps = {
  invoice: Invoice;
  repName: string;
  repTitle: string;
};

const SignatureBlock = ({ invoice, repName, repTitle }: SignatureBlockProps) => {
  const isPackingList = invoice.documentType === 'packing';

  if (isPackingList || invoice.documentType === 'commercial') {
    return (
      <div className="avoid-break border-t pt-4">
        <div className="mt-8 flex justify-center">
          <div className="border-t border-foreground pt-1 max-w-sm text-center w-full">
            <p className="font-semibold text-sm">{repName}</p>
            <p className="text-xs text-muted-foreground">{repTitle}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="avoid-break border-t pt-4">
      <h3 className="font-semibold mb-3 text-sm">CLIENT APPROVAL:</h3>
      <div className="grid grid-cols-2 gap-6 mt-8">
        <div>
          <div className="border-t border-foreground pt-1">
            <p className="font-semibold text-sm">{invoice.clientRepresentative}</p>
            <p className="text-xs text-muted-foreground">{invoice.clientCompanyPosition}</p>
          </div>
        </div>
        <div>
          <div className="border-t border-foreground pt-1">
            <p className="font-semibold text-sm">{repName}</p>
            <p className="text-xs text-muted-foreground">{repTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PageLabel = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
  <div className="mt-auto pt-6 text-right text-xs text-muted-foreground">
    Page {pageNumber} of {totalPages}
  </div>
);

export const InvoicePrintPreview = ({ invoice, onBack }: InvoicePrintPreviewProps) => {
  const pageHeightPx = mmToPx(A4_HEIGHT_MM);
  const contentHeightPx = mmToPx(A4_HEIGHT_MM - PAGE_PADDING_MM * 2);
  const company = getCompanyData(invoice.companyType, invoice.exporterAddressKey);
  const incotermCode = (invoice.incoterm || '').toUpperCase();
  const currencyLabel = invoice.currency || 'US$';
  const showPortLoading = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incotermCode);
  const showPortDischarge = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incotermCode);
  const showPlaceOfDelivery = ['CPT', 'CIP', 'FCA'].includes(incotermCode);
  const showPlaceOfDestination = ['CPT', 'CIP', 'DAP', 'DPU', 'DDP'].includes(incotermCode);
  const subtotal = invoice.items.reduce((sum, item) => sum + normalizeNumber(item.total), 0);
  const itemsWeight = invoice.items.reduce((sum, item) => sum + computeItemTotalWeight(invoice, item), 0);
  const itemPackingWeight = invoice.items.reduce((sum, item) => {
    const packingWeight = normalizeNumber(item.packingWeight);
    const quantity = normalizeNumber(item.qty);
    return sum + packingWeight * quantity;
  }, 0);
  const totalPackingWeight = invoice.includePackingWeight
    ? invoice.totalPackingWeight ?? itemPackingWeight ?? invoice.packingWeight ?? 0
    : 0;
  const totalWeight = itemsWeight + totalPackingWeight;
  const freightCost = normalizeNumber(invoice.freightCost);
  const insuranceCost = normalizeNumber(invoice.insuranceCost);
  const showFreightLine =
    ['commercial', 'proforma'].includes(invoice.documentType) &&
    (freightCost > 0 || ['CFR', 'CPT', 'CIF', 'CIP'].includes(incotermCode));
  const showInsuranceLine =
    ['commercial', 'proforma'].includes(invoice.documentType) &&
    (insuranceCost > 0 || ['CIF', 'CIP'].includes(incotermCode));
  const discountValue = invoice.applyDiscount
    ? Math.min(Math.max(normalizeNumber(invoice.discountAmount), 0), subtotal)
    : 0;
  const totalAmountBeforeDiscount =
    ['CIF', 'CIP'].includes(incotermCode)
      ? subtotal + freightCost + insuranceCost
      : ['CFR', 'CPT'].includes(incotermCode)
        ? subtotal + freightCost
        : subtotal;
  const totalAmount = Math.max(totalAmountBeforeDiscount - discountValue, 0);
  const documentTitle =
    invoice.documentType === 'proforma'
      ? 'PROFORMA INVOICE'
      : invoice.documentType === 'commercial'
        ? 'COMMERCIAL INVOICE'
        : 'PACKING LIST';
  const showTotalWeight = invoice.showTotalWeight ?? true;
  const notes = (invoice.notes || '').trim();
  const hasNotes = notes.length > 0;
  const fullTailBlocks: TailBlockKey[] = [
    'summary',
    ...(hasNotes ? ['notes' as TailBlockKey] : []),
    'signature',
  ];
  const repName = (invoice.clientPosition || '').trim() || 'Caroline Franzen';
  const repTitle = (invoice.clientPositionTitle || '').trim() || 'Verdetec Administrative Manager';

  const fitPageInnerRef = useRef<HTMLDivElement | null>(null);
  const headerMeasureRef = useRef<HTMLDivElement | null>(null);
  const tableHeaderMeasureRef = useRef<HTMLTableSectionElement | null>(null);
  const rowMeasureRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const summaryMeasureRef = useRef<HTMLDivElement | null>(null);
  const notesMeasureRef = useRef<HTMLDivElement | null>(null);
  const signatureMeasureRef = useRef<HTMLDivElement | null>(null);
  const pageLabelMeasureRef = useRef<HTMLDivElement | null>(null);

  const [pages, setPages] = useState<PreviewPage[]>([
    {
      items: invoice.items,
      tailBlocks: fullTailBlocks,
    },
  ]);
  const [fitToPage, setFitToPage] = useState(false);
  const [fitContentHeight, setFitContentHeight] = useState(0);

  useLayoutEffect(() => {
    const headerHeight = headerMeasureRef.current?.getBoundingClientRect().height ?? 0;
    const tableHeaderHeight = tableHeaderMeasureRef.current?.getBoundingClientRect().height ?? 0;
    const pageLabelHeight = pageLabelMeasureRef.current?.getBoundingClientRect().height ?? 0;
    const summaryHeight = summaryMeasureRef.current?.getBoundingClientRect().height ?? 0;
    const notesHeight = notesMeasureRef.current?.getBoundingClientRect().height ?? 0;
    const signatureHeight = signatureMeasureRef.current?.getBoundingClientRect().height ?? 0;

    const tailBlocks: TailBlock[] = [
      { key: 'summary', height: summaryHeight },
      ...(hasNotes ? [{ key: 'notes' as TailBlockKey, height: notesHeight }] : []),
      { key: 'signature', height: signatureHeight },
    ];

    const rowHeights = invoice.items.map(
      (item) => rowMeasureRefs.current[item.id]?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT_PX
    );

    const nextPages = buildPreviewPages({
      items: invoice.items,
      rowHeights,
      itemPageCapacity: contentHeightPx - headerHeight - tableHeaderHeight - pageLabelHeight,
      itemPageCapacityWithTail:
        contentHeightPx -
        headerHeight -
        tableHeaderHeight -
        pageLabelHeight -
        tailBlocks.reduce((sum, block) => sum + block.height, 0),
      tailOnlyPageCapacity: contentHeightPx - headerHeight - pageLabelHeight,
      tailBlocks,
    });

    setPages(nextPages);
  }, [contentHeightPx, hasNotes, invoice]);

  const displayedPages: PreviewPage[] = fitToPage
    ? [{ items: invoice.items, tailBlocks: fullTailBlocks }]
    : pages;
  const fitScale =
    fitToPage && fitContentHeight > pageHeightPx
      ? Math.min(1, pageHeightPx / fitContentHeight)
      : 1;

  useLayoutEffect(() => {
    if (!fitToPage) {
      setFitContentHeight(0);
      return;
    }

    setFitContentHeight(fitPageInnerRef.current?.scrollHeight ?? 0);
  }, [fitToPage, invoice, hasNotes, pageHeightPx]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-print-root min-h-screen bg-muted">
      <div className="preview-toolbar print:hidden p-4 bg-background border-b flex gap-4 items-center">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button variant={fitToPage ? 'default' : 'outline'} onClick={() => setFitToPage((value) => !value)}>
          {fitToPage ? 'Tamanho real' : 'Ajustar para caber em A4'}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {fitToPage
            ? `Conteudo compactado em uma pagina A4${fitScale < 1 ? ` (${Math.round(fitScale * 100)}%)` : ''}`
            : 'Pre-visualizacao paginada em A4'}
        </div>
      </div>

      <div className="invoice-preview-pages print:p-0 p-8 space-y-6">
        {displayedPages.map((page, pageIndex) => {
          const isFitPage = fitToPage;
          return (
          <div
            key={`${pageIndex}-${page.items.length}-${page.tailBlocks.join('-')}`}
            className="preview-sheet bg-background w-[210mm] mx-auto shadow-lg border border-muted-foreground/40"
            style={{
              minHeight: `${A4_HEIGHT_MM}mm`,
              height: isFitPage ? `${A4_HEIGHT_MM}mm` : undefined,
              overflow: isFitPage ? 'hidden' : undefined,
            }}
          >
            <div
              ref={isFitPage ? fitPageInnerRef : undefined}
              className="preview-sheet-inner p-[15mm] flex flex-col"
              style={{
                minHeight: `${A4_HEIGHT_MM - PAGE_PADDING_MM * 2}mm`,
                transform: isFitPage ? `scale(${fitScale})` : undefined,
                transformOrigin: isFitPage ? 'top left' : undefined,
                width: isFitPage && fitScale < 1 ? `${100 / fitScale}%` : undefined,
              }}
            >
              <PreviewHeader
                invoice={invoice}
                documentTitle={documentTitle}
                company={company}
                showPortLoading={showPortLoading}
                showPortDischarge={showPortDischarge}
                showPlaceOfDelivery={showPlaceOfDelivery}
                showPlaceOfDestination={showPlaceOfDestination}
              />

              {page.items.length > 0 && (
                <ItemsTable invoice={invoice} items={page.items} currencyLabel={currencyLabel} />
              )}

              <div className="space-y-4">
                {page.tailBlocks.includes('summary') && (
                  <SummaryBlock
                    invoice={invoice}
                    company={company}
                    currencyLabel={currencyLabel}
                    subtotal={subtotal}
                    freightCost={freightCost}
                    insuranceCost={insuranceCost}
                    discountValue={discountValue}
                    totalAmount={totalAmount}
                    totalWeight={totalWeight}
                    totalPackingWeight={totalPackingWeight}
                    showTotalWeight={showTotalWeight}
                    showFreightLine={showFreightLine}
                    showInsuranceLine={showInsuranceLine}
                  />
                )}

                {page.tailBlocks.includes('notes') && hasNotes && <NotesBlock notes={notes} />}

                {page.tailBlocks.includes('signature') && (
                  <SignatureBlock invoice={invoice} repName={repName} repTitle={repTitle} />
                )}
              </div>

              <PageLabel pageNumber={pageIndex + 1} totalPages={displayedPages.length} />
            </div>
          </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="preview-measurement fixed left-[-10000px] top-0 pointer-events-none opacity-0 print:hidden"
      >
        <div className="w-[210mm]">
          <div className="p-[15mm]">
            <div ref={headerMeasureRef}>
              <PreviewHeader
                invoice={invoice}
                documentTitle={documentTitle}
                company={company}
                showPortLoading={showPortLoading}
                showPortDischarge={showPortDischarge}
                showPlaceOfDelivery={showPlaceOfDelivery}
                showPlaceOfDestination={showPlaceOfDestination}
              />
            </div>

            <ItemsTable
              invoice={invoice}
              items={invoice.items}
              currencyLabel={currencyLabel}
              rowRefs={rowMeasureRefs}
              tableHeaderRef={tableHeaderMeasureRef}
            />

            <div ref={summaryMeasureRef}>
              <SummaryBlock
                invoice={invoice}
                company={company}
                currencyLabel={currencyLabel}
                subtotal={subtotal}
                freightCost={freightCost}
                insuranceCost={insuranceCost}
                discountValue={discountValue}
                totalAmount={totalAmount}
                totalWeight={totalWeight}
                totalPackingWeight={totalPackingWeight}
                showTotalWeight={showTotalWeight}
                showFreightLine={showFreightLine}
                showInsuranceLine={showInsuranceLine}
              />
            </div>

            {hasNotes && (
              <div ref={notesMeasureRef}>
                <NotesBlock notes={notes} />
              </div>
            )}

            <div ref={signatureMeasureRef}>
              <SignatureBlock invoice={invoice} repName={repName} repTitle={repTitle} />
            </div>

            <div ref={pageLabelMeasureRef}>
              <PageLabel pageNumber={1} totalPages={1} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .invoice-print-root,
          .invoice-print-root * {
            visibility: visible;
          }

          .invoice-print-root {
            position: absolute;
            inset: 0;
            background: white;
          }

          .preview-toolbar,
          .preview-measurement {
            display: none !important;
          }

          .invoice-preview-pages {
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            background: white !important;
          }

          .preview-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            break-after: page;
            page-break-after: always;
          }

          .preview-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .preview-sheet-inner {
            min-height: calc(297mm - 30mm) !important;
          }

          table {
            page-break-inside: auto;
          }

          tr,
          .avoid-break,
          img {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
