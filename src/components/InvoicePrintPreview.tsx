import { Invoice, COMPANY_DATA } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import verdetecLogo from '@/assets/verdetec-logo.png';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

export const InvoicePrintPreview = ({ invoice, onBack }: InvoicePrintPreviewProps) => {
  const handlePrint = () => {
    window.print();
  };

  const company = COMPANY_DATA[invoice.companyType];
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const totalWeight = invoice.items.reduce((sum, item) => sum + (item.weight * item.qty), 0) + (invoice.packingWeight || 0);
  const documentTitle = invoice.documentType === 'proforma' ? 'PROFORMA INVOICE' : 
                        invoice.documentType === 'commercial' ? 'COMMERCIAL INVOICE' : 
                        'PACKING LIST';
  const isPackingList = invoice.documentType === 'packing';
  const logoColor = invoice.companyType === 'insumos' ? '#104444' : '#EC6D1D';
  const showTotalWeight = invoice.documentType === 'proforma' ? (invoice.showTotalWeight ?? true) : true;

  return (
    <div className="min-h-screen bg-muted">
      <div className="print:hidden p-4 bg-background border-b flex gap-4">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="print:p-0 p-8">
        <div className="bg-background w-[210mm] mx-auto p-[15mm] print:shadow-none shadow-lg" style={{ minHeight: '297mm' }}>
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
              <p className="text-xs">{company.address}</p>
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
              <p className="text-xs"><span className="font-semibold">Mode of Transport:</span> {invoice.modeOfTransport}</p>
              {invoice.documentType === 'proforma' && (
                <p className="text-xs"><span className="font-semibold">Availability:</span> {invoice.availability}</p>
              )}
              <p className="text-xs"><span className="font-semibold">Currency:</span> {invoice.currency}</p>
              <p className="text-xs"><span className="font-semibold">Payment Method:</span> {invoice.paymentMethod}</p>
              {invoice.documentType === 'packing' && invoice.sourceInvoiceId && (
                <p className="text-xs"><span className="font-semibold">Associated Commercial Invoice:</span> {invoice.sourceInvoiceId}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-foreground">
                {!isPackingList && <th className="text-left py-2 px-2 text-sm">HS CODE (NCM)</th>}
                <th className="text-center py-2 px-2 text-sm">QTY</th>
                <th className="text-left py-2 px-2 text-sm">DESCRIPTION</th>
                <th className="text-right py-2 px-2 text-sm">Weight {isPackingList ? 'per Unit' : ''} (KG)</th>
                {!isPackingList && <th className="text-right py-2 px-2 text-sm">UNIT PRICE</th>}
                {!isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL</th>}
                {isPackingList && <th className="text-right py-2 px-2 text-sm">TOTAL WEIGHT</th>}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b">
                  {!isPackingList && <td className="py-2 px-2 text-sm">{item.hsCode}</td>}
                  <td className="text-center py-2 px-2 text-sm">{item.qty}</td>
                  <td className="py-2 px-2 text-sm">{item.description}</td>
                  <td className="text-right py-2 px-2 text-sm">{item.weight.toFixed(2)}</td>
                  {!isPackingList && <td className="text-right py-2 px-2 text-sm">${item.unitPrice.toFixed(2)}</td>}
                  {!isPackingList && <td className="text-right py-2 px-2 text-sm">${item.total.toFixed(2)}</td>}
                  {isPackingList && <td className="text-right py-2 px-2 text-sm">{(item.weight * item.qty).toFixed(2)}</td>}
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-semibold">
                {isPackingList ? (
                  <>
                    <td colSpan={3} className="py-2 px-2 text-sm text-right">Total Weight:</td>
                    <td className="text-right py-2 px-2 text-sm">{totalWeight.toFixed(2)} KG</td>
                  </>
                ) : invoice.documentType === 'commercial' ? (
                  <>
                    <td colSpan={3} className="py-2 px-2 text-sm text-right">Total Weight:</td>
                    <td className="text-right py-2 px-2 text-sm">{totalWeight.toFixed(2)}</td>
                    <td className="text-right py-2 px-2 text-sm">Subtotal:</td>
                    <td className="text-right py-2 px-2 text-sm">${subtotal.toFixed(2)}</td>
                  </>
                ) : showTotalWeight ? (
                  <>
                    <td colSpan={3} className="py-2 px-2 text-sm text-right">Total Weight:</td>
                    <td className="text-right py-2 px-2 text-sm">{totalWeight.toFixed(2)}</td>
                    <td className="text-right py-2 px-2 text-sm">Subtotal:</td>
                    <td className="text-right py-2 px-2 text-sm">${subtotal.toFixed(2)}</td>
                  </>
                ) : (
                  <>
                    <td colSpan={4} className="py-2 px-2 text-sm text-right"></td>
                    <td className="text-right py-2 px-2 text-sm">Subtotal:</td>
                    <td className="text-right py-2 px-2 text-sm">${subtotal.toFixed(2)}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>

          {/* Bank Details and Total / Weight Summary */}
          {!isPackingList ? (
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <h3 className="font-semibold mb-1 text-sm">Bank Details:</h3>
                <p className="text-xs">Bank: {company.bankDetails.bank}</p>
                <p className="text-xs">SWIFT: {company.bankDetails.swift}</p>
                <p className="text-xs">IBAN: {company.bankDetails.iban}</p>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold">Total Amount</p>
                <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-muted rounded">
              <div className="text-right">
                <p className="text-lg font-bold">Total Shipment Weight</p>
                <p className="text-xl font-bold">{totalWeight.toFixed(2)} KG</p>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {invoice.notes && (
            <div className="mt-4 mb-2">
              <h3 className="font-semibold mb-1 text-sm">Note:</h3>
              <p className="text-xs whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="mt-6 pt-4 border-t">
            {!isPackingList ? (
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
                      <p className="font-semibold text-sm">{invoice.clientPosition}</p>
                      <p className="text-xs text-muted-foreground">{invoice.clientPositionTitle}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-3 text-sm">PREPARED BY:</h3>
                <div className="mt-8">
                  <div className="border-t border-foreground pt-1 max-w-sm">
                    <p className="font-semibold text-sm">{invoice.clientPosition}</p>
                    <p className="text-xs text-muted-foreground">{invoice.clientPositionTitle}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
