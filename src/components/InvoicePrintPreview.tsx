import { useEffect, useRef, useState } from 'react';
import { Invoice, getCompanyData } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import verdetecLogo from '@/assets/verdetec-logo.png';
import { formatInvoiceAmount } from '@/utils/numberFormat';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

export const InvoicePrintPreview = ({ invoice, onBack }: InvoicePrintPreviewProps) => {
  const ITEMS_PER_PAGE = 10;
  const mmToPx = (mm: number) => (mm * 96) / 25.4;
  const A4_HEIGHT_PX = mmToPx(297);

  const itemChunks = [];
  for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
    itemChunks.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
  }
  const totalPages = itemChunks.length || 1;

  const [fitToPage, setFitToPage] = useState(false);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const heights = innerRefs.current.map((el) => el?.scrollHeight || 0);
    setPageHeights(heights);
  }, [invoice, totalPages, fitToPage]);

  const computedScales = pageHeights.map((h) => {
    if (!fitToPage || h <= A4_HEIGHT_PX) return 1;
    return Math.min(1, A4_HEIGHT_PX / h);
  });

  const hasOverflow = pageHeights.some((h) => h > A4_HEIGHT_PX + 2);

  const handlePrint = () => {
    window.print();
  };

  const company = getCompanyData(invoice.companyType, invoice.exporterAddressKey);
  const incotermCode = (invoice.incoterm || '').toUpperCase();
  const currencyLabel = invoice.currency || 'US$';
  const showPortLoading = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incotermCode);
  const showPortDischarge = ['FOB', 'FAS', 'CFR', 'CIF'].includes(incotermCode);
  const showPlaceOfDelivery = ['CPT', 'CIP', 'FCA'].includes(incotermCode);
  const showPlaceOfDestination = ['CPT', 'CIP', 'DAP', 'DPU', 'DDP'].includes(incotermCode);
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const computeItemTotalWeight = (item: any) => {
    const normalize = (val: any) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(',', '.'); // handle decimal with comma
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };
    const qtyNum = normalize(item.qty);
    const weightNum = normalize(item.weight);
    if (invoice.companyType === 'insumos') {
      // For INSUMOS: qty is KG; fall back to weight if qty is missing
      return qtyNum || weightNum;
    }
    return weightNum * qtyNum;
  };
  const itemsWeight = invoice.items.reduce((sum, item) => sum + computeItemTotalWeight(item), 0);
  const itemPackingWeight = invoice.items.reduce((sum, item) => {
    const normalize = (val: any) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(',', '.');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };
    const pack = normalize(item.packingWeight);
    const qty = normalize(item.qty);
    return sum + (pack * qty);
  }, 0);
  const totalPackingWeight = invoice.includePackingWeight
    ? (invoice.totalPackingWeight ?? itemPackingWeight ?? invoice.packingWeight ?? 0)
    : 0;
  const totalWeight = itemsWeight + totalPackingWeight;
  const freightCost = invoice.freightCost || 0;
  const insuranceCost = invoice.insuranceCost || 0;
  const showFreightLine =
    ['commercial', 'proforma'].includes(invoice.documentType) &&
    (freightCost > 0 || ['CFR', 'CPT', 'CIF', 'CIP'].includes(incotermCode));
  const showInsuranceLine =
    ['commercial', 'proforma'].includes(invoice.documentType) &&
    (insuranceCost > 0 || ['CIF', 'CIP'].includes(incotermCode));
  const discountValue = invoice.applyDiscount ? Math.min(Math.max(invoice.discountAmount || 0, 0), subtotal) : 0;
  const totalAmountBeforeDiscount =
    ['CIF', 'CIP'].includes(incotermCode)
      ? subtotal + freightCost + insuranceCost
      : ['CFR', 'CPT'].includes(incotermCode)
        ? subtotal + freightCost
        : subtotal;
  const totalAmount = Math.max(totalAmountBeforeDiscount - discountValue, 0);
  const documentTitle = invoice.documentType === 'proforma' ? 'PROFORMA INVOICE' : 
                        invoice.documentType === 'commercial' ? 'COMMERCIAL INVOICE' : 
                        'PACKING LIST';
  const isPackingList = invoice.documentType === 'packing';
  const logoColor = invoice.companyType === 'insumos' ? '#104444' : '#EC6D1D';
  const showTotalWeight = invoice.showTotalWeight ?? true;
  const hasNotes = (invoice.notes || '').trim().length > 0;
  const repName = (invoice.clientPosition || '').trim() || 'Caroline Franzen';
  const repTitle = (invoice.clientPositionTitle || '').trim() || 'Verdetec Administrative Manager';

  return (
    <div className="min-h-screen bg-muted">
      <div className="print:hidden p-4 bg-background border-b flex gap-4 items-center">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button variant={fitToPage ? 'default' : 'outline'} onClick={() => setFitToPage((v) => !v)}>
          {fitToPage ? 'Tamanho real' : 'Ajustar para caber em A4'}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground flex items-center">
          {hasOverflow && !fitToPage
            ? 'Conteúdo excede A4: ative "Ajustar para caber" ou reduza itens.'
            : 'Dentro da área A4'}
        </div>
      </div>

      <div className="print:p-0 p-8 space-y-6">
        {itemChunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === totalPages - 1;
          const scale = computedScales[pageIndex] ?? 1;
          const fixedHeight = fitToPage ? '297mm' : undefined;
          return (
            <div
              key={pageIndex}
              className="bg-background w-[210mm] mx-auto print:shadow-none shadow-lg border border-muted-foreground/40"
              style={{
                minHeight: fitToPage ? undefined : '297mm',
                height: fixedHeight,
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                overflow: fitToPage ? 'hidden' : 'visible',
              }}
              ref={(el) => {
                pageRefs.current[pageIndex] = el;
              }}
            >
              <div
                style={{
                  padding: '15mm',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: scale < 1 ? `${100 / scale}%` : '100%',
                }}
                ref={(el) => {
                  innerRefs.current[pageIndex] = el;
                }}
              >
          {/* Header with Logo */}
          <div className="flex justify-between items-start mb-4">
            <img 
              src={verdetecLogo} 
              alt="Verdetec Logo" 
              className="h-10"
              style={{ 
                filter: invoice.companyType === 'insumos' 
                  ? 'brightness(0) saturate(100%) invert(16%) sepia(28%) saturate(1745%) hue-rotate(137deg) brightness(92%) contrast(95%)'
                  : 'brightness(0) saturate(100%) invert(43%) sepia(89%) saturate(1721%) hue-rotate(4deg) brightness(99%) contrast(91%)'
              }}
            />
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">{documentTitle}</h1>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Supplier and Invoice Info */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Supplier / Exporter:</h3>
              <p className="font-bold text-sm">{company.name}</p>
              <p className="text-xs">CNPJ: {company.cnpj}</p>
              <p className="text-xs whitespace-nowrap">{company.address}</p>
              <p className="text-xs">ZIP Code: {company.zipCode}</p>
              <p className="text-xs">Phone: {company.phone}</p>
              <p className="text-xs">Country of Origin: Brazil</p>
            </div>
            
            <div className="text-right">
              <p className="text-xs"><span className="font-semibold">Invoice No.:</span> {invoice.invoiceNumber}</p>
              <p className="text-xs"><span className="font-semibold">Issue Date:</span> {invoice.issueDate}</p>
              <p className="text-xs"><span className="font-semibold">Place of Issue:</span> {invoice.placeOfIssue}</p>
            </div>
          </div>

          {/* Importer and Terms */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Importer / Buyer:</h3>
              <p className="font-bold text-sm">{invoice.importerCompanyName}</p>
              <p className="text-xs">{invoice.importerTaxId}</p>
              <p className="text-xs">{invoice.importerAddress}</p>
              <p className="text-xs">Zip Code: {invoice.importerZipCode}</p>
              <p className="text-xs">Phone: {invoice.importerPhone}</p>
              {invoice.importerEmail && <p className="text-xs">E-mail: {invoice.importerEmail}</p>}
              <p className="text-xs">Country of Destination: {invoice.importerCountry}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xs"><span className="font-semibold">INCOTERM:</span> {invoice.incoterm}</p>
              <p className="text-xs"><span className="font-semibold">Currency:</span> {invoice.currency || 'USD'}</p>
              <p className="text-xs"><span className="font-semibold">Mode of Transport:</span> {invoice.modeOfTransport}</p>
              {invoice.availability && invoice.documentType === 'proforma' && (
                <p className="text-xs"><span className="font-semibold">Availability:</span> {invoice.availability}</p>
              )}
              {showPortLoading && invoice.portOfLoading && (
                <p className="text-xs"><span className="font-semibold">Port of Loading:</span> {invoice.portOfLoading}</p>
              )}
              {showPortDischarge && invoice.portOfDischarge && (
                <p className="text-xs"><span className="font-semibold">Port of Discharge:</span> {invoice.portOfDischarge}</p>
              )}
              {showPlaceOfDestination && invoice.placeOfDestination && (
                <p className="text-xs"><span className="font-semibold">Named Place of Destination:</span> {invoice.placeOfDestination}</p>
              )}
              {showPlaceOfDelivery && invoice.placeOfDelivery && (
                <p className="text-xs"><span className="font-semibold">Final Delivery Location:</span> {invoice.placeOfDelivery}</p>
              )}
              <p className="text-xs">
                <span className="font-semibold">
                  {invoice.documentType === 'commercial' ? 'Terms of Payment:' : 'Payment Method:'}
                </span>{' '}
                {invoice.paymentMethod}
              </p>
              {invoice.documentType === 'packing' && invoice.sourceInvoiceId && (
                <p className="text-xs"><span className="font-semibold">Packing List related to Commercial Invoice Nº:</span> {invoice.sourceInvoiceId}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4">
            <thead>
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
                {!isPackingList && <th className="text-right py-2 px-2 text-sm">{invoice.companyType === 'insumos' ? 'UNIT PRICE (per kg)' : 'UNIT PRICE'}</th>}
                {!isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL</th>}
                {isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL WEIGHT</th>}
              </tr>
            </thead>
            <tbody>
              {chunk.map((item) => (
                <tr key={item.id} className="border-b">
                  {!isPackingList && <td className="py-2 px-2 text-sm">{item.hsCode}</td>}
                  <td className="text-center py-2 px-2 text-sm">
                    {invoice.companyType === 'insumos' && !isPackingList
                      ? (invoice.documentType === 'commercial'
                          ? (item.weight || 0)
                          : (item.qty || item.weight || 0)
                        ).toFixed(2)
                      : item.qty}
                  </td>
                  <td className="py-2 px-2 text-sm">{item.description}</td>
                  {invoice.companyType !== 'insumos' && (
                    <td className="text-right py-2 px-2 text-sm">{item.weight.toFixed(2)}</td>
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
                  {computeItemTotalWeight(item).toFixed(2)}
                </td>
              )}
            </tr>
          ))}
          {!isPackingList && isLastPage && (
            <>
              {invoice.includePackingWeight && totalPackingWeight > 0 && (
                <tr>
                  {!isPackingList ? (
                    invoice.companyType !== 'insumos' ? (
                      <>
                        <td className="py-2 px-2 text-sm"></td>
                        <td className="py-2 px-2 text-sm"></td>
                        <td className="py-2 px-2 text-sm text-right">Packing Weight (kg):</td>
                        <td className="text-right py-2 px-2 text-sm">{totalPackingWeight.toFixed(2)}</td>
                        <td className="py-2 px-2 text-sm"></td>
                        <td className="py-2 px-2 text-sm"></td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-2 text-sm" colSpan={2}>
                          Packing Weight (kg): {totalPackingWeight.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-sm" colSpan={3}></td>
                      </>
                    )
                  ) : (
                    <>
                      <td className="py-2 px-2 text-sm"></td>
                      <td className="py-2 px-2 text-sm"></td>
                      <td className="py-2 px-2 text-sm text-right">Packing Weight (kg):</td>
                      <td className="text-right py-2 px-2 text-sm">{totalPackingWeight.toFixed(2)}</td>
                    </>
                  )}
              </tr>
            )}
              <tr>
                <td
                  colSpan={invoice.companyType === 'insumos' ? 5 : 6}
                  className="py-1"
                >
                  <div className="border-t-2 border-foreground w-full"></div>
                </td>
              </tr>
              <tr className="font-semibold">
                {showTotalWeight ? (
                  <>
                    <td
                      colSpan={invoice.companyType === 'insumos' ? 2 : 3}
                      className="py-2 px-2 text-sm text-center"
                    >
                      Total Weight (kg):
                    </td>
                    <td className="py-2 px-2 text-sm text-center">
                      {totalWeight.toFixed(2)}{invoice.companyType !== 'insumos' ? '' : ' KG'}
                    </td>
                  </>
                ) : (
                  <td
                    colSpan={invoice.companyType === 'insumos' ? 3 : 4}
                    className="py-2 px-2 text-sm"
                  />
                )}
                <td className="text-right py-2 px-2 text-sm">Subtotal:</td>
                <td className="text-right py-2 px-2 text-sm">
                  {currencyLabel} {formatInvoiceAmount(subtotal, currencyLabel)}
                </td>
              </tr>
            </>
          )}
          {isLastPage && isPackingList && (
            <tr className="border-t-2 border-foreground font-semibold">
              {showTotalWeight ? (
                <>
                      <td colSpan={3} className="py-2 px-2 text-sm text-right">Total Weight (kg):</td>
                      <td className="text-right py-2 px-2 text-sm">{totalWeight.toFixed(2)} KG</td>
                    </>
                  ) : (
                    <td colSpan={4} className="py-2 px-2 text-sm"></td>
                  )}
                </tr>
              )}
            </tbody>
          </table>

          {/* Bank Details and Total / Weight Summary */}
          {isLastPage && !isPackingList ? (
            invoice.documentType === 'commercial' ? (
              <div className="flex flex-col items-end mb-4 gap-1">
                <div className="text-right">
                  <div className="text-xs text-foreground space-y-1">
                    {showFreightLine && (
                      <p>Freight: {currencyLabel} {formatInvoiceAmount(freightCost, currencyLabel)}</p>
                    )}
                    {showInsuranceLine && (
                      <p>Insurance: {currencyLabel} {formatInvoiceAmount(insuranceCost, currencyLabel)}</p>
                    )}
                    {discountValue > 0 && (
                      <p>Discount: - {currencyLabel} {formatInvoiceAmount(discountValue, currencyLabel)}</p>
                    )}
                  </div>
                  <p className="text-xs text-foreground mt-1">
                    <span className="font-semibold text-base text-foreground">Total Amount:</span>
                    <span className="font-bold text-xl ml-2">
                      {currencyLabel} {formatInvoiceAmount(totalAmount, currencyLabel)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <h3 className="font-semibold mb-1 text-sm">Bank Details:</h3>
                  <p className="text-xs">Bank: {company.bankDetails.bank}</p>
                  <p className="text-xs">SWIFT: {company.bankDetails.swift}</p>
                  <p className="text-xs">IBAN: {company.bankDetails.iban}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold">Total Amount</p>
                  <div className="text-xs text-foreground space-y-1">
                    {showFreightLine && (
                      <p>Freight: {currencyLabel} {formatInvoiceAmount(freightCost, currencyLabel)}</p>
                    )}
                    {showInsuranceLine && (
                      <p>Insurance: {currencyLabel} {formatInvoiceAmount(insuranceCost, currencyLabel)}</p>
                    )}
                    {discountValue > 0 && (
                      <p>Discount: - {currencyLabel} {formatInvoiceAmount(discountValue, currencyLabel)}</p>
                    )}
                  </div>
                  <p className="text-xl font-bold mt-1">
                    {currencyLabel} {formatInvoiceAmount(totalAmount, currencyLabel)}
                  </p>
                </div>
              </div>
            )
          ) : isLastPage && showTotalWeight ? (
            <div className="mb-4 p-4 bg-muted rounded">
              <div className="text-right">
                <p className="text-lg font-bold">Total Shipment Weight</p>
                <p className="text-xl font-bold">{totalWeight.toFixed(2)} kg</p>
              </div>
            </div>
          ) : null}

          {/* Notes Section */}
          {isLastPage && hasNotes && (
            <div className="mt-4 mb-2">
              <h3 className="font-semibold mb-1 text-sm">Note:</h3>
              <p className="text-xs whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Signature Area */}
          {isLastPage && (
          <div className="mt-6 pt-4 border-t">
            {!isPackingList ? (
              invoice.documentType === 'commercial' ? (
                <div className="mt-8 flex justify-center">
                  <div className="border-t border-foreground pt-1 max-w-sm text-center">
                    <p className="font-semibold text-sm">{repName}</p>
                    <p className="text-xs text-muted-foreground">{repTitle}</p>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )
            ) : (
              <div className="mt-8 flex justify-center">
                <div className="border-t border-foreground pt-1 max-w-sm text-center">
                  <p className="font-semibold text-sm">{repName}</p>
                  <p className="text-xs text-muted-foreground">{repTitle}</p>
                </div>
              </div>
            )}
          </div>
          )}

          <div className="mt-6 text-right text-xs text-muted-foreground">
            Page {pageIndex + 1} of {totalPages}
          </div>
          </div>
        </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0, .print\\:p-0 * {
            visibility: visible;
          }
          .print\\:p-0 {
            position: absolute;
            left: 0;
            top: 0;
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
